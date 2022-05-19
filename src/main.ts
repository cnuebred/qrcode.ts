import { randomBytes } from 'crypto'
import { QRcode } from './qr_code'

const app = async () => {
    const data = {
        time: Date.now(),
        message: 'Hello world',
        next: randomBytes(16).toString('hex')
    }
    new QRcode(JSON.stringify(data), { minErrorLevel: 'M' }).render()
    const svg = new QRcode(JSON.stringify(data), { minErrorLevel: 'M' }).renderSvg()
    console.log(svg)
}


app()
