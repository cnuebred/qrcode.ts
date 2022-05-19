// Galois Field

import { BASE_POLYNOMIAL, MODULO_BYTE_WISE, Polynomial } from "./d"

const exponentGalois = (exponent: number, base = 2) => {
    if (exponent >= 255) while (exponent > 255) exponent = exponent % 255
    if (exponent == 8) return (base ** exponent) ^ MODULO_BYTE_WISE
    else if (exponent > 8) {
        const prevPower = exponentGalois(exponent - 1) * 2
        return prevPower >= 255 ? prevPower ^ MODULO_BYTE_WISE : prevPower
    } else return base ** exponent
}

const reverseExponentGalois = (target: number, base = 2) => {
    if (target >= 255) while (target > 255) target = target % 255
    for (let i = 0; i < 256; i++) {
        if (target == exponentGalois(i, base))
            return i
    }
}

const multiplyPolynomials = (expression: Polynomial[], byExpression: Polynomial[]) => {
    const combine = expression.map(expr => {
        return byExpression.map(byExpr => {
            return ({ x: expr.x + byExpr.x, alpha: expr.alpha + byExpr.alpha })
        }).flat()
    }).flat()

    const polynomial = {}
    combine.forEach(expr => {
        const value = polynomial[expr.x] ? polynomial[expr.x] : 0
        polynomial[expr.x] = value ^ (exponentGalois(expr.alpha))
    })
    return Object.entries(polynomial).reverse().map(([exponentX, exponentAlpha]) => {
        return {
            x: parseInt(exponentX),
            alpha: reverseExponentGalois(exponentAlpha as number) || 0,
        }
    })
}
const getGeneratorPolynomial = (n: number) => {
    let tmpPolynomial = BASE_POLYNOMIAL()
    for (let i = 1; i < n; i++) {
        tmpPolynomial = multiplyPolynomials(tmpPolynomial, BASE_POLYNOMIAL(i))
    }
    return tmpPolynomial
}
const decreasePolynomial = (polynomialGenerator: Polynomial[]) => multiplyPolynomials(
    polynomialGenerator, [{ x: -1, alpha: 0 }]
)

const getDivPolynomial = (decWords: number[], errorCorrection: number) => {
    let polynomialMessage = getGeneratorPolynomial(decWords.length - 1)
        .map((item, index) => {
            item.x += errorCorrection
            item['value'] = decWords[index]
            return item
        })
    const exponentDiffX = polynomialMessage[0].x - errorCorrection
    let polynomialGenerator = getGeneratorPolynomial(errorCorrection)
        .map(item => {
            item.x = item.x + exponentDiffX
            return item
        })


    let buffer = 0
    for (let i = 0; i < exponentDiffX + (decWords.length < 19 ? 1 : 0) + (buffer); i++) {
        // MULTI
        const leadExponent = reverseExponentGalois(polynomialMessage[0]['value'])
        const tmpPolynomialGenerator = multiplyPolynomials(
            polynomialGenerator, [{ x: 0, alpha: leadExponent }]
        ).map(item => {
            item['value'] = exponentGalois(item.alpha)
            return item
        })

        // XOR
        const mapping = (base, side) => {
            return base.map((item, index) => {
                item['value'] = side(item['value'], index)
                return item
            })
        }

        if (polynomialMessage.length == tmpPolynomialGenerator.length) buffer++
        if (polynomialMessage.length > tmpPolynomialGenerator.length)
            polynomialMessage = mapping(polynomialMessage,
                (item, index) => { return item ^ (tmpPolynomialGenerator[index]?.['value'] || 0) })
        else
            polynomialMessage = mapping(tmpPolynomialGenerator,
                (item, index) => { return (polynomialMessage[index]?.['value'] || 0) ^ item })

        let x = 0
        while (polynomialMessage[0]['value'] == 0) {
            polynomialMessage.shift()
            x++
        }
        if (x > 1) {
            buffer--
            polynomialGenerator = decreasePolynomial(polynomialGenerator)
        }
        polynomialGenerator = decreasePolynomial(polynomialGenerator)
    }
    return polynomialMessage
}

export { getDivPolynomial }
