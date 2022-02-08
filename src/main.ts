import { randomBytes } from 'crypto'
import { QRcode as Wr } from './qr_code'

const app = async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = {
        time: Date.now(),
        message: 'Hello world',
        next: randomBytes(16).toString('hex')
    }
    new Wr('Hello World', { minErrorLevel: 'M', minVersion: 1 }).render()
}
app()




