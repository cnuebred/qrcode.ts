import { ALIGNMENT_LOCATION_BASE, BASE_SIZE, LENGTH_BITS, TABLE_EC, VERSION_FORMAT_POLYNOMIAL } from "./d"

const capacity = (totalBits) => {
    return {
        numeric: Math.floor(totalBits / 10 * 3 +
            ((totalBits % 10) > 6 ? 2 : (totalBits % 10) > 3 ? 1 : 0)),
        alpha: Math.floor(totalBits / 11) * 2 + (totalBits % 11 > 5 ? 1 : 0),
        byte: totalBits >> 3,
        kanji: Math.floor(totalBits / 13)
    }
}
const byteNamesOfMode = {
    'byte': 0b0100,
    'numeric': 0b0001,
    'alpha': 0b0010,
    'kanji': 0b1000,
}

const maskCondition = {
    '000': (column, row) => { return (column + row) % 2 == 0 },
    '001': (column, row) => { return (row) % 2 == 0 },
    '010': (column) => { return (column) % 3 == 0 },
    '011': (column, row) => { return (column + row) % 3 == 0 },
    '100': (column, row) => { return (Math.floor(column / 3) + Math.floor(row / 2)) % 2 == 0 },
    '101': (column, row) => { return (((row * column) % 2) + ((row * column) % 3)) == 0 },
    '110': (column, row) => { return ((((row * column) % 2) + ((row * column) % 3))) % 2 == 0 },
    '111': (column, row) => { return ((((row + column) % 2) + ((row * column) % 3))) % 2 == 0 },
}


const addPaddingWithoutPrefix = (string: string, paddingSize: number) => {
    return ((string + '0'.repeat(paddingSize)).slice(0, paddingSize)).replace(/^0+?(?=1)/, '')
}
const getArrayBinaryPolynomial = (versionSize: string, i = 10, str = '') => {
    str += VERSION_FORMAT_POLYNOMIAL[versionSize].includes(i) ? '1' : '0'
    if (i <= 0) return str
    return getArrayBinaryPolynomial(versionSize, i - 1, str)
}
const getErrorCorrectionLevelData = (version: number, errorLevel: string) => {
    const [errorCodewordsPerBlock, blocksNumber] = TABLE_EC[version - 1]?.[errorLevel.toUpperCase()]
    if (!errorCodewordsPerBlock) return undefined
    const totalModules = getTotalModulesDataVersion(version) >> 3
    const secondGroup = totalModules % blocksNumber
    const codewords = totalModules - errorCodewordsPerBlock * blocksNumber
    const groups = [blocksNumber - secondGroup, secondGroup]
    const codewordsInGroup = Math.floor(codewords / blocksNumber)
    return {
        codewords: codewords,
        blocks: blocksNumber,
        groups,
        codewordsInGroup: [codewordsInGroup, codewordsInGroup + 1],
        errorCorrectionCodewords: errorCodewordsPerBlock
    }
}
function getTotalModulesDataVersion(version) {
    if (version === 1) {
        return 21 * 21 - 3 * 8 * 8 - 2 * 15 - 1 - 2 * 5;
    }
    const alignmentCount = Math.floor(version / 7) + 2;
    return (version * 4 + 17) ** 2
        - 3 * 8 * 8
        - (alignmentCount ** 2 - 3) * 5 * 5
        - 2 * (version * 4 + 1)
        + (alignmentCount - 2) * 5 * 2
        - 2 * 15
        - 1
        - (version > 6 ? 2 * 3 * 6 : 0);
}
const getLengthBits = (mode: string, version: number) => {
    const modeIndex = 31 - Math.clz32(byteNamesOfMode[mode]);
    const bitsIndex = version > 26 ? 2 : version > 9 ? 1 : 0;
    return LENGTH_BITS[modeIndex][bitsIndex];
}
const getCodewordsNumber = (version: number, errorLevel: string) => {
    const [errorCodewordsPerBlock, blocksNumber] = TABLE_EC[version - 1]?.[errorLevel.toUpperCase()]
    if (!errorCodewordsPerBlock) return undefined
    return (getTotalModulesDataVersion(version) >> 3) - errorCodewordsPerBlock * blocksNumber
}
const totalCapacity = (version, errorLevel, encodingMode) => {
    const codewordsNumber = getCodewordsNumber(version, errorLevel)
    const freeModules = (codewordsNumber << 3) - getLengthBits(encodingMode, version) - 4
    return capacity(freeModules)[encodingMode]
}
const getBinaryMessageData = (data: string) => {
    return Array.from(data).map(item => {
        return ('0'.repeat(8) + item.charCodeAt(0).toString(2)).slice(-8)
    })
}
const getFromBinaryMessage = (binary: string) => {
    return binary.split(/(.{8})(?=.)/).filter(item => item != '').map(item => {
        return parseInt(item, 2)
    })
}
const getVersionSize = (version: number) => { return BASE_SIZE + (version - 1) * 4 }

const getAlignmentColumnsAndRows = (version: number) => {
    if (version < 2) return []
    version = version - 2
    const versionAlign = (version * 4)
    const alignment = JSON.parse(JSON.stringify(ALIGNMENT_LOCATION_BASE))
    alignment[alignment.length - 1] = ALIGNMENT_LOCATION_BASE[1] + versionAlign

    const alignmentCount = Math.ceil(((((BASE_SIZE + versionAlign - 4) - ALIGNMENT_LOCATION_BASE[0]) / 14)) / 2)

    let diff = Math.ceil((ALIGNMENT_LOCATION_BASE[1] + versionAlign - alignment[0]) / (alignmentCount))
    if (diff % 2 != 0) diff += 1

    for (let j = 2; j < 7; j++) {
        if (alignmentCount >= j) {
            alignment.splice(alignment.length - (j - 1), 0, alignment[alignment.length - (j - 1)] - diff)
        }
    }
    return alignment
}

export { maskCondition, getArrayBinaryPolynomial, addPaddingWithoutPrefix, getAlignmentColumnsAndRows, getVersionSize, totalCapacity, getErrorCorrectionLevelData, getLengthBits, getBinaryMessageData, getFromBinaryMessage }