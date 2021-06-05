import * as express from 'express';
import { Request, Response } from 'express';
import * as cors from 'cors';
import { createConnection } from 'typeorm';
import { Product } from './entity/product';
import * as amqp from 'amqplib/callback_api';
import axios from 'axios';

createConnection().then(db => {
    const productRespository = db.getRepository(Product);

    amqp.connect('amqps://yahfrnbv:7iiBA9qgiG3msMZgA6go5zrh3Aa0ebnx@cow.rmq2.cloudamqp.com/yahfrnbv', (error0, connection) => {
        if (error0)
            throw error0;

        connection.createChannel((error1, channel) => {
            if (error1)
                throw error1;

            const app = express();

            channel.assertQueue('product_created', { durable: false });
            channel.assertQueue('product_updated', { durable: false });
            channel.assertQueue('product_deleted', { durable: false });
            
            app.use(cors({
                origin: ['http://localhost:3000', 'http://localhost:8000', 'http://localhost:4200']
            }))
            
            app.use(express.json());

            app.get('/api/products', async (req: Request, res: Response) => {
                const products = await productRespository.find();

                return res.send(products);
            });

            app.get('/api/products/:id/like', async (req: Request, res: Response) => {
                const product = await productRespository.findOne(req.params.id);
                
                await axios.post(`http://localhost:8001/api/products/${product.admin_id}/like`, {});

                product.likes++;

                productRespository.save(product);

                return res.send(product);
            })

            channel.consume('product_created', async (msg) => {
                const eventProduct: Product = JSON.parse(msg.content.toString());

                const product = new Product();

                product.admin_id = parseInt(eventProduct.id);
                product.title = eventProduct.title;
                product.image = eventProduct.image;
                product.likes = eventProduct.likes;

                console.log('product_created');
                productRespository.save(product);
            }, {noAck: true});

            channel.consume('product_updated', async (msg) => {
                const eventProduct: Product = JSON.parse(msg.content.toString());

                const product = await productRespository.findOne({ admin_id: parseInt(eventProduct.id) });

                productRespository.merge(product, {
                    title: eventProduct.title,
                    image: eventProduct.image,
                    likes: eventProduct.likes
                });

                console.log('product_updated');
                productRespository.save(product);
            }, {noAck: true});


            channel.consume('product_deleted', async (msg) => {
                const admin_id = parseInt(msg.content.toString());

                console.log('product_deleted');
                await productRespository.delete({ admin_id });
            });
            
            console.log('Listening on port: 8001');
            app.listen(8001);  
            
            process.on('beforeExit', () => {
                console.log('Closing');
                
                connection.close()
            });
        });
    });            
});