import { stringToHexstring, ReedSalomonAddressDecode, assertNotUndefined, assertNotEqual, assertExpression, deepCopy, parseDecimalNumber } from '../repository'

const dummyLine = '0:0'

describe('Strings to hexstring', () => {
    it('should convert: simple string ( <= 0x7f)', () => {
        const str = 'Simple'
        const hexstring = '00 00 65 6c 70 6d 69 53'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert: string sucessfully ( > 0x7f and < 0x800)', () => {
        const str = 'Até'
        const hexstring = '00 00 00 00 a9 c3 74 41'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert: utf split between longs', () => {
        const str = 'aaaaaaéa'
        const hexstring = ' 00 00 00 00 00 00 00 61 a9 c3 61 61 61 61 61 61'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert string sucessfully (chinese)', () => {
        const str = '中华人民共和国'
        const hexstring = '000000bd9be58c92e5b185e591b0e6babae48e8de5adb8e4'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert string sucessfully (empty string)', () => {
        const str = ''
        const hexstring = '00 00 00 00 00 00 00 00'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert string sucessfully (between 0xdfff and 0x10000 )', () => {
        const str = '＃＞'
        const hexstring = '00 00 9e bc ef 83 bc ef'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert string sucessfully (over 0x10000)', () => {
        const str = '🨁'
        const hexstring = '00 00 00 00 81 a8 9f f0'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    test('should throw: wrong string data', () => {
        expect(() => {
            const str = '🨁🨁🨁'.substr(0, 5)
            stringToHexstring(str, dummyLine)
        }).toThrowError(/^At line/)
    })
    test('should throw: wrong string data', () => {
        expect(() => {
            const str = '🨁🨁🨁'.substr(0, 5) + 'SS'
            stringToHexstring(str, dummyLine)
        }).toThrowError(/^At line/)
    })
    it('should convert: simple escape codes', () => {
        const str = '3\\n3\\r3\\t3\\\\3\\\'3\\"3'
        const hexstring = '00 00 00 33 22 33 27 33 5c 33 09 33 0d 33 0a 33'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    test('should throw: wrong simple escape code', () => {
        expect(() => {
            const str = '33\\c33'
            stringToHexstring(str, dummyLine)
        }).toThrowError(/^At line/)
    })
    it('should convert: escaped hexadecimal right', () => {
        const str = 'a\\x01a'
        const hexstring = '00 00 00 00 00 61 01 61'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    test('should throw: wrong escaped hexadecimal', () => {
        expect(() => {
            const str = '33\\xfg33'
            stringToHexstring(str, dummyLine)
        }).toThrowError(/^At line/)
    })
    test('should throw: wrong escaped hexadecimal', () => {
        expect(() => {
            const str = '33\\xf'
            stringToHexstring(str, dummyLine)
        }).toThrowError(/^At line/)
    })
    it('should convert: escaped unicode right', () => {
        const str = 'a\\u668ba'
        const hexstring = '00 00 00 61 8b 9a e6 61'
        const result = stringToHexstring(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    test('should throw: wrong escaped unicode', () => {
        expect(() => {
            const str = '33\\u3fgh33'
            stringToHexstring(str, dummyLine)
        }).toThrowError(/^At line/)
    })
    test('should throw: wrong escaped unicode', () => {
        expect(() => {
            const str = '33\\u3f3'
            stringToHexstring(str, dummyLine)
        }).toThrowError(/^At line/)
    })
})

describe('Reed-Salomon decode', () => {
    it('should convert: EYCN-TQE9-K5RV-GQZFF', () => {
        const str = 'EYCN-TQE9-K5RV-GQZFF'
        const hexstring = 'e6 b7 f6 cd 98 76 79 54'
        const result = ReedSalomonAddressDecode(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert: 2222-2622-Y8GQ-22222', () => {
        const str = '2222-2622-Y8GQ-22222'
        const hexstring = '00 00 00 01 00 00 00 00'
        const result = ReedSalomonAddressDecode(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert: 2222-2222-2222-22222 (id zero)', () => {
        const str = '2222-2222-2222-22222'
        const hexstring = '00 00 00 00 00 00 00 00'
        const result = ReedSalomonAddressDecode(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    it('should convert: ZZZZ-ZZZZ-QY2K-HZZZZ (last valid id)', () => {
        const str = 'ZZZZ-ZZZZ-QY2K-HZZZZ'
        const hexstring = 'ff ff ff ff ff ff ff ff'
        const result = ReedSalomonAddressDecode(str, dummyLine)
        expect(result).toBe(hexstring.replace(/ /g, ''))
    })
    test('should throw: Address overflow (id >= 2^64)', () => {
        expect(() => {
            const code = '2223-2222-AUZT-J2222'
            ReedSalomonAddressDecode(code, dummyLine)
        }).toThrowError(/^At line/)
    })
    test('should throw: wrong address', () => {
        expect(() => {
            const code = 'LQSJ-DXPH-8HZG-CZXQC'
            ReedSalomonAddressDecode(code, dummyLine)
        }).toThrowError(/^At line/)
    })
    test('should throw: wrong address', () => {
        expect(() => {
            const code = 'LQSJ-DXPH-HHZG-CZXQH'
            ReedSalomonAddressDecode(code, dummyLine)
        }).toThrowError(/^At line/)
    })
})

describe('assert/deepcopy functions', () => {
    it('should pass: assertNotUndefined', () => {
        const num = 2
        const result = assertNotUndefined(num + 2, 'New Error')
        expect(result).toBe(4)
    })
    test('should throw: assertNotUndefined', () => {
        expect(() => {
            assertNotUndefined(undefined, 'New Error')
        }).toThrowError('New Error')
    })
    test('should throw: assertNotUndefined', () => {
        expect(() => {
            assertNotUndefined(undefined)
        }).toThrowError('Internal error')
    })
    it('should pass: assertNotEqual', () => {
        const num = 2
        const result = assertNotEqual(num + 2, 0, 'Error')
        expect(result).toBe(4)
    })
    test('should throw: assertNotEqual', () => {
        expect(() => {
            assertNotEqual(undefined, 5, 'New Error')
        }).toThrowError('New Error')
    })
    test('should throw: assertNotEqual', () => {
        expect(() => {
            assertNotEqual(2, 2, 'Internal error')
        }).toThrowError('Internal error')
    })
    it('should pass: assertExpression', () => {
        let num = 2
        num++
        const result = assertExpression(num === 3, 'Error')
        expect(result).toBe(true)
    })
    test('should throw: assertExpression', () => {
        let num = 2
        num++
        expect(() => {
            assertExpression(num === 0, 'New Error')
        }).toThrowError('New Error')
    })
    test('should throw: assertExpression', () => {
        let num = 2
        num++
        expect(() => {
            assertExpression(num === 0)
        }).toThrowError('Internal error')
    })
    test('should throw: assertExpression', () => {
        let num = 2
        num++
        expect(() => {
            assertExpression(num === 0)
        }).toThrowError('Internal error')
    })
    it('should pass: deepCopy object', () => {
        const data = { a: 5, b: 'notjo' }
        const copy = deepCopy(data)
        expect(data).toEqual(copy)
        expect(data).not.toBe(copy)
    })
    it('should pass: deepCopy array', () => {
        const data = [5, 23, 'notjo']
        const copy = deepCopy(data)
        expect(copy).toBeInstanceOf(Array)
        expect(data).toEqual(copy)
        expect(data).not.toBe(copy)
    })
    it('should pass: deepCopy date', () => {
        const data = new Date(2018, 11, 24, 10, 33, 30, 0)
        const copy = deepCopy(data)
        expect(copy).toBeInstanceOf(Date)
        expect(data).toEqual(copy)
        expect(data).not.toBe(copy)
    })
})

describe('parseDecimal error', () => {
    test('should throw: two decimal points', () => {
        expect(() => {
            parseDecimalNumber('2.234.33', dummyLine)
        }).toThrowError(/^At line/)
    })
    test('should throw: more than 8 decimals', () => {
        expect(() => {
            parseDecimalNumber('2.123456789', dummyLine)
        }).toThrowError(/^At line/)
    })
})
