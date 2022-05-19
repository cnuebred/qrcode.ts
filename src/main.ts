import { randomBytes } from 'crypto'
import { Seqrity } from '.'

const app = async () => {
    const data = {
        time: Date.now(),
        message: 'Hello world',
        next: randomBytes(16).toString('hex')
    }
    new Seqrity(JSON.stringify(data), { minErrorLevel: 'M' }).render()
    const svg = new Seqrity(JSON.stringify(data), { minErrorLevel: 'M' }).renderSvg()
    console.log(svg)
}


app()
