import { BLANK_FILLER, FINDER_SIZE, FORMAT_STRING_XOR_VALUE, LEVEL_INDICATOR, MODE_INDICATOR, ReedSolomonOptions, REMINDER } from "./utils"
import { getDivPolynomial } from "./polynomial"
import { addPaddingWithoutPrefix, getAlignmentColumnsAndRows, getArrayBinaryPolynomial, getBinaryMessageData, getErrorCorrectionLevelData, getFromBinaryMessage, getLengthBits, getVersionSize, maskCondition, totalCapacity } from "./qr_code_utils"


export class ReedSolomonData {
    data: string
    codewords = ''
    formatString = ''
    versionString = ''
    version: number
    terminator = '0000'
    errorLevel: string
    mask = '100' // TODO - add option to change mask optimize
    mode = 'byte'
    bits: string
    options: ReedSolomonOptions
    constructor(data: string, options?: ReedSolomonOptions) {
        this.data = data
        this.options = {
            minVersion: options?.minVersion || 2,
            minErrorLevel: options?.minErrorLevel || 'H'
        }
        this.getVersionAndErrorLevel()
        this.generateDataBits()
    }
    generateDataBits = () => {
        this.bits = this.createReedSolomonMatrix().join('') + '0'.repeat(REMINDER[this.version - 1])
    }
    getVersionAndErrorLevel = (): void => {
        const length = this.data.length
        let errorLevels = 'LQMH'

        errorLevels = errorLevels.slice(errorLevels.indexOf(this.options.minErrorLevel.toUpperCase()))
        for (let version = this.options.minVersion; version <= 40; version++)
            for (const errorLevel of errorLevels)
                if (totalCapacity(version, errorLevel, this.mode) >= length) {
                    this.version = version
                    this.errorLevel = errorLevel
                    return
                }
    }
    generateContent = (): number[] => {
        const errorCorrectionData = getErrorCorrectionLevelData(this.version, this.errorLevel)
        const messageLength = this.data.length
        const dataInformationBinaryLength = getLengthBits(this.mode, this.version)
        const codewordsDiff = (errorCorrectionData.codewords -
            (dataInformationBinaryLength >> 3) - 1) - messageLength
        const messageDataLengthBinary = ('0'.repeat(dataInformationBinaryLength) + ((messageLength).toString(2))).slice(-dataInformationBinaryLength)
        const dataCodewords = getBinaryMessageData(this.data)
        const binaryMessage = [
            MODE_INDICATOR[this.mode],
            messageDataLengthBinary,
            ...dataCodewords,
            this.terminator].join('')
        const padding = []
        for (let i = 0; i < codewordsDiff; i++) padding.push(BLANK_FILLER[i % 2])
        return getFromBinaryMessage([...binaryMessage, ...padding].join(''))
    }
    createReedSolomonMatrix = (): string[] => {
        const codewords = this.generateContent()
        const errorCorrectionTable = getErrorCorrectionLevelData(this.version, this.errorLevel)
        const groups = []
        for (let groupNumber = 0; groupNumber < 2; groupNumber++)
            for (let i = 0; i < errorCorrectionTable.groups[groupNumber]; i++) {
                const sub = errorCorrectionTable.codewordsInGroup[groupNumber]
                const group = codewords.splice(0, sub)
                const polynomial = getDivPolynomial(group, errorCorrectionTable.errorCorrectionCodewords)
                    .map(item => {
                        return item['value']
                    })
                groups.push({ group, polynomial })
            }
        const messageCodewords = []
        const errorCorrectionCodewords = []
        groups.forEach((block, blockIndex) => {
            const provideIndex = (index: number) => { return blockIndex + (index + (index * (errorCorrectionTable.blocks - 1))) }
            block.group.forEach((item, index) => {
                messageCodewords[provideIndex(index)] = item
            })
            block.polynomial.forEach((item, index) => {
                errorCorrectionCodewords[provideIndex(index)] = item
            })
        })
        return [...messageCodewords, ...errorCorrectionCodewords]
            .filter(item => item != undefined)
            .map(item => { return ('0'.repeat(8) + (item).toString(2)).slice(-8) })
    }
    // Format and Version string
    xorStringOperator = (result: string, limit: number, generatorPolynomialString: string) => {
        while (result.length > limit) {
            const generatorPolynomialTmp = generatorPolynomialString + '0'.repeat(result.length - generatorPolynomialString.length)
            result = (parseInt(result, 2) ^ parseInt(generatorPolynomialTmp, 2)).toString(2)
        }
        return result
    }
    universal = (data: string, dataBinLength: number, type: string, limitBin: number) => {
        const prefixFormatString = addPaddingWithoutPrefix(data, dataBinLength)
        const generatorPolynomial = getArrayBinaryPolynomial(type, limitBin)
        const result = this.xorStringOperator(prefixFormatString, limitBin, generatorPolynomial)
        return ('0'.repeat(limitBin - result.length) + result)
    }
    createFormatString = () => {
        const level_mask = LEVEL_INDICATOR[this.errorLevel] + this.mask
        const divisionFormatString = this.universal(level_mask, 15, 'format', 10)
        const combineFormatStrings = (parseInt((level_mask + divisionFormatString), 2) ^ parseInt(FORMAT_STRING_XOR_VALUE, 2)).toString(2)
        return ('0'.repeat(15 - combineFormatStrings.length) + combineFormatStrings)
    }
    createVersionString = () => {
        const version = ('0'.repeat(6) + this.version.toString(2)).slice(-6)
        const divisionFormatString = this.universal(version, 18, 'version', 12)
        const combineFormatStrings = (parseInt((version + divisionFormatString), 2)).toString(2)
        return ('0'.repeat(18 - combineFormatStrings.length) + combineFormatStrings)

    }
}

export class QRcode extends ReedSolomonData {
    polygon: (number | string)[][]
    alignments: number[]
    size: number
    constructor(data, options?: ReedSolomonOptions) {
        super(data, options)
        this.size = getVersionSize(this.version)
        this.alignments = getAlignmentColumnsAndRows(this.version)
        this.resetPolygon()
    }
    private resetPolygon = () => {
        this.polygon = [...Array(this.size)].map(() => {
            return [...Array(this.size).fill('-')]
        })
    }
    put = (items: (string | number)[][], cords: number[], reverse = false) => {
        items.forEach((item: string[], index) => {
            item.forEach((item, indexItem) => {
                if (reverse)
                    this.polygon[indexItem + cords[0]][index + cords[1]] = parseInt(item) as (1 | 0)
                else this.polygon[index + cords[0]][indexItem + cords[1]] = parseInt(item) as (1 | 0)
            })
        })
    }
    generateFinder = () => {
        const border = '0000000'
        const padding = '0111110'
        const kernel = '0100010'
        const halfFinder = [border, padding, kernel]
        const finder = [...halfFinder, kernel, ...halfFinder.reverse()]
            .map(item => { return item.split('') })
        const margin = ['1'.repeat(8).split('')]
        this.put(finder, [0, 0])
        this.put(finder, [0, this.size - 7])
        this.put(finder, [this.size - 7, 0])

        const cordsMargin = [[7, 0], [this.size - 8, 0], [7, this.size - 8]]
        cordsMargin.forEach(cords => {
            this.put(margin, cords)
            this.put(margin, cords.reverse(), true)

        })
    }
    generateTiming = () => {
        const bar = '01'.repeat(((this.size - (FINDER_SIZE * 2)) / 2) + 2) // dragons were here 
        this.put([bar.split('')], [6, 6])
        this.put(bar.split('').map(item => { return [item] }), [6, 6])
    }
    generateAlignment = () => {
        const border = '0'.repeat(5)
        const padding = '01110'
        const kernel = '01010'
        const upper = [border, padding, kernel, padding, border]
            .map(row => { return row.split('') })
        const [first, last] = [this.alignments[0], this.alignments[this.alignments.length - 1]]
        this.alignments.forEach(column => {
            this.alignments.forEach(row => {
                if ((column == first && row == last)
                    || (column == last && row == first)
                    || (column == first && row == first))
                    return
                this.put(upper, [column - 2, row - 2])
            })
        })
    }
    generateDarkModule = () => {
        this.put([[0]], [this.size - 8, 8])
    }
    generateFormatString = () => {
        let formatString = this.createFormatString().split('')
            .map(item => { return item == '1' ? '0' : '1' })
        this.put([formatString.slice(0, 6)], [8, 0]) // horizontal
        this.put([formatString.slice(6, 8)], [8, 7]) // horizontal
        this.put([formatString.slice(7)], [8, this.size - 8]) // horizontal

        formatString = formatString.reverse()
        this.put([formatString.slice(0, 6)], [0, 8], true) // vertical
        this.put([formatString.slice(6, 8)], [7, 8], true) // vertical
        this.put([formatString.slice(7)], [this.size - 8, 8], true) // vertical
    }
    generateVersionString = () => {
        const versionString = this.createVersionString().split('')
            .map(item => { return item == '1' ? '0' : '1' })

        const area = [...Array(6)].map(() => {
            return [versionString.pop(), versionString.pop(), versionString.pop()]
        })
        this.put(area, [0, this.size - 8 - 3])
        this.put(area, [this.size - 8 - 3, 0], true)
    }
    insertData = () => {
        const cords = {
            x: this.size - 1,
            y: this.size - 1,
            direction: 1,
            evenUpper: true,
            evenLower: true
        }
        const bits = this.bits.split('')
        const bitsLength = bits.length
        const tryLimit = () => {
            if (cords.y < 0) {
                ++cords.y; --cords.x; cords.x--
                cords.direction = 0
                return true
            }
            else if (cords.y == this.size) {
                --cords.y; --cords.x; cords.x--
                cords.direction = 1
                return true
            }
            return false
        }
        const upper = (even) => {
            return {
                y: even ? cords.y : cords.y--,
                x: even ? cords.x-- : cords.x++
            }
        }
        const lower = (even) => {
            return {
                y: even ? cords.y : cords.y++,
                x: even ? cords.x-- : cords.x++
            }
        }
        const maskFunction = maskCondition[this.mask]
        const bitOperator = (stepFunction, even, side) => {
            const step = stepFunction(cords[even])
            cords[even] = !cords[even]
            if (this.polygon[step.y][step.x] != '-') return side()
            let bit = bits.shift()
            if (!maskFunction(step.x, step.y))
                bit = bit == '1' ? '0' : '1'
            if (!bit) return
            this.polygon[step.y][step.x] = parseInt(bit) as (0 | 1)
        }

        const up = () => {
            if (tryLimit()) return true
            return bitOperator(upper, 'evenUpper', up)
        }
        const down = () => {
            if (tryLimit()) return true
            return bitOperator(lower, 'evenLower', down)
        }
        let flip = 0
        for (let i = 0; i < bitsLength + flip; i++) {
            if (cords.x < 0)
                break
            if (cords.x == 6) cords.x-- // single exception in generate qr code
            const lim = cords.direction ? up() : down()
            if (lim) flip++
        }
    }
    buildMarginVertical = () => {
        const margin = '1'.repeat(this.size).split('').map(item => { return parseInt(item) as (0 | 1 | "-" | ".") })
        for (let i = 0; i < 3; i++) {
            this.polygon.unshift(JSON.parse(JSON.stringify(margin)))
            this.polygon.push(JSON.parse(JSON.stringify(margin)))
        }
    }
    private renderData = () => {
        this.resetPolygon()
        this.generateFinder()
        this.generateTiming()
        this.generateAlignment()
        this.generateDarkModule()
        this.generateFormatString()
        if (this.version >= 7) this.generateVersionString()
        this.insertData()
        this.buildMarginVertical()
    }
    renderSvg = (pixelSize = 5, color: { light: string, dark: string } = { light: '#ffffff', dark: '#000000' }) => {
        this.renderData()
        const create_polygon = (width: number, height: number) => {
            const svg_polygon = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">CONTENT</svg>`
            return svg_polygon
        }
        const create_rect = (x: number, y: number, a: number, color = '#000000') => {
            const rect = `<rect x="${x}" y="${y}" width="${a}" height="${a}" fill="${color}"></rect>`
            return rect
        }
        const create_qr_svg = (qr_data: string, block_size: number) => {
            const a = Math.floor(Math.sqrt(qr_data.length))
            const polygon = create_polygon(a * block_size, a * block_size)
            let rects = ''
            for (let h = 0; h < a; h++)
                for (let w = 0; w < a; w++) {
                    const rect = create_rect(w * block_size, h * block_size, block_size, qr_data[w + h * a] == '1' ? color.light : color.dark)
                    rects += rect

                }
            return polygon.replace('CONTENT', rects)
        }
        let qr_data = ''
        this.polygon.forEach(item => {
            item.unshift(1, 1, 1)
            item.push(1, 1, 1)
            qr_data += item.join('')
        })
        return { svg: create_qr_svg(qr_data, pixelSize), version: this.version, errorLevel: this.errorLevel, size: this.size }
    }
    render = () => {
        return { data: this.polygon, version: this.version, errorLevel: this.errorLevel, size: this.size }
    }
}
