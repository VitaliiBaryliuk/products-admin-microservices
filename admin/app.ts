import * as express from 'express';
import { Request, Response } from 'express';
import * as cors from 'cors';
import { createConnection } from 'typeorm';
import { Product } from './src/entity/product';

createConnection().then(db => {
    const productRespository = db.getRepository(Product);
    const app = express();

    app.use(cors({
        origin: ['http://localhost:3000', 'http://localhost:8000', 'http://localhost:4200']
    }))

    app.use(express.json());

    app.get('api/products', async (req: Request, res: Response) => {
        const products = await productRespository.find();

        res.json(products);
    });

    console.log('Listening on port: 8000');
    app.listen(8000);
});