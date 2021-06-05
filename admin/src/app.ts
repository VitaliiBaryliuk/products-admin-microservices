import * as express from 'express';
import { Request, Response } from 'express';
import * as cors from 'cors';
import { createConnection } from 'typeorm';
import { Product } from './src/entity/product';
import * as amqp from 'amqplib/callback_api';

createConnection().then(db => {
    const productRespository = db.getRepository(Product);

    amqp.connect('amqps://yahfrnbv:7iiBA9qgiG3msMZgA6go5zrh3Aa0ebnx@cow.rmq2.cloudamqp.com/yahfrnbv', (error0, connection) => {
        if (error0)
            throw error0;

        connection.createChannel((error1, channel) => {
            if (error1)
                throw error1;

            const app = express();

            app.use(cors({
                origin: ['http://localhost:3000', 'http://localhost:8000', 'http://localhost:4200']
            }))

            app.use(express.json());

            app.get('/api/products', async (req: Request, res: Response) => {
                const products = await productRespository.find();

                res.json(products);
            });

            app.post('/api/products', async (req: Request, res: Response) => {
                const product = await productRespository.create(req.body);
            
                
                const result = await productRespository.save(product);
                channel.sendToQueue('product_created', Buffer.from(JSON.stringify(result)));
                
                res.send(result);
            })

            app.get('/api/products/:id', async (req: Request, res: Response) => {
                const product = await productRespository.findOne(req.params.id);

                res.send(product);
            });

            app.put('/api/products/:id', async (req: Request, res: Response) => {
                const product = await productRespository.findOne(req.params.id);

                productRespository.merge(product, req.body);

                const result = await productRespository.save(product);

                channel.sendToQueue('product_updated', Buffer.from(JSON.stringify(result)));

                res.send(result);
            });
            
            app.delete('/api/products/:id', async (req: Request, res: Response) => {
                const result = await productRespository.delete(req.params.id);

                channel.sendToQueue('product_deleted', Buffer.from(req.params.id));

                res.send(result);
            });

            app.post('/api/products/:id/like', async (req: Request, res: Response) => {
                const product = await productRespository.findOne(req.params.id);
                
                product.likes++;

                const result = await productRespository.save(product);
                
                res.send(result);
            })

            console.log('Listening on port: 8000');
            app.listen(8000);
            
            process.on('beforeExit', () => {
                console.log('Closing');

                connection.close()
            });
        })
    });
});