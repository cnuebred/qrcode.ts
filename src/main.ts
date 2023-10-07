import { randomBytes } from 'crypto'
import { writeFile } from 'fs'
import { Seqrity } from '.'

const app = async () => {
    const data = (num) => {
        return {
            time: Date.now(),
            message: 'Hello world',
            next: randomBytes(num).toString('hex')
        }
    }
    // new Seqrity(JSON.stringify(data(8)), { minErrorLevel: 'M' }).render()
    // new Seqrity(JSON.stringify(data(16)), { minErrorLevel: 'M' }).render()
    // new Seqrity(JSON.stringify(data(32)), { minErrorLevel: 'M' }).render()
    // new Seqrity(JSON.stringify(data(64)), { minErrorLevel: 'M' }).render()
    // new Seqrity(JSON.stringify(data(128)), { minErrorLevel: 'M' }).render()
    // new Seqrity(JSON.stringify(data(256)), { minErrorLevel: 'M' }).render()
    // new Seqrity(JSON.stringify(data(512)), { minErrorLevel: 'M' }).render()
    // const svg = new Seqrity('{"exp":1653126926893,"ws":"c2f78b7b127f99d2999015f37faa4a3d3f587744e8540fe75a7b770fc71a6929"}').renderSvg()
    // const svg_ = new Seqrity('{"exp":1653126926893,"ws":"c2f78b7b127f99d2999015f37faa4a3d3f587744e8540fe75a7b770fc71a6929"}').render()
    const blob = new Seqrity('')
    const svg = new Seqrity("https://youtu.be/dQw4w9WgXcQ", { minErrorLevel: 'Q' }).renderSvg()
    const svg_ = new Seqrity("https://youtu.be/dQw4w9WgXcQ", { minErrorLevel: 'Q' }).render()
    // for (let i = 0; i < svg_.data.length; i++) {
    //     if ((svg_.data[i] == svg_.data[i - 1] || svg_.data[i] == svg_.data[i + 1]) && (parseInt(svg_.data[i]) == parseInt(svg_.data[i + 1]) * parseInt(svg_.data[i - 1])))
    //     new_ += '1'
    //     else
    //     new_ += '0'
    // }
    let new_svg = svg_.data
    const list_ = []
    const list = []
    const loop = () => {
        const full = ''
        for (let j = 0; j < 200; j++) {
            let new_ = ''
            for (let i = 0; i < new_svg.length; i++) {
                const row = Math.sqrt(new_svg.length)
                //if ((new_svg[i] == new_svg[i - 1] || new_svg[i] == new_svg[i + 1]) && (parseInt(new_svg[i]) == parseInt(new_svg[i + 1]) * parseInt(new_svg[i - 1])))
                let param = j % 2 == 0 ? (j % 5 == 0 ? row : row / 2) : (j % 7 == 0 ? 3 : 1)
                if (param + i % 5 == 0) param = param * Math.PI
                param = Math.floor(param)

                if ((new_svg[i] == new_svg[i - param] || new_svg[i] == new_svg[i + param]) &&
                    (parseInt(new_svg[i]) == parseInt(new_svg[i + param]) * parseInt(new_svg[i - param]))
                )
                    new_ += '1'
                else
                    new_ += '0'
            }
            new_svg = new_
            list_.push(new_svg)
            list.push(blob.renderSvgBin(new_, 5, { light: '#9aceeb', dark: '#15be4c' }) + '   ')
        }
    }
    loop()
    writeFile('./index.html', svg.svg + ' ' + list.slice(-100, -1).join(''), (err) => {

        if (err) throw err;
        console.log('The file has been saved!');
    })
    console.log(list_.length)
    console.log(Array.from(new Set(list_)).length)
}


app()
