import { assertExpression, assertNotUndefined } from '../../repository/repository'
import { CONTRACT } from '../../typings/contractTypes'
import { MEMORY_SLOT, OFFSET_MODIFIER_CONSTANT } from '../../typings/syntaxTypes'
import { FLATTEN_MEMORY_RETURN_OBJECT } from '../codeGeneratorTypes'
import utils from '../utils'
import { flattenMemory } from './createInstruction'

/**
 * Create assembly intructions for an assignment.
 * @returns the assembly code necessary for the assignment to happen
 */
export default function assignmentToAsm (
    Program: CONTRACT, Left: MEMORY_SLOT, Right: MEMORY_SLOT, operationLine: string
) : string {
    /** Main function */
    function assignmentToAsmMain (): string {
        switch (Left.type) {
        case 'register':
        case 'long':
        case 'fixed':
        case 'structRef':
            return leftRegularToAsm()
        case 'array':
            return leftArrayToAsm()
        default:
            throw new Error(`Internal error at line: ${operationLine}.`)
        }
    }

    /** Left side type is 'register', 'long' or 'structRef'. Create assembly instruction. */
    function leftRegularToAsm (): string {
        let RightMem: FLATTEN_MEMORY_RETURN_OBJECT
        let offsetVarName: string
        let assemblyCode: string
        switch (Left.Offset?.type) {
        case undefined:
            switch (Right.type) {
            case 'constant':
                return leftRegularOffsetUndefinedAndRightConstantToAsm()
            case 'register':
            case 'long':
            case 'fixed':
            case 'structRef':
                return leftRegularOffsetUndefinedAndRightRegularToAsm()
            case 'array':
                return leftRegularOffsetUndefinedAndRightArrayToAsm()
            default:
                throw new Error(`Internal error at line: ${operationLine}.`)
            }
        case 'constant':
            return leftRegularOffsetConstantToAsm(Left.Offset)
        case 'variable':
            RightMem = flattenMemory(Program, Right, operationLine)
            offsetVarName = Program.Context.getMemoryObjectByLocation(Left.Offset.addr).asmName
            assemblyCode = `SET @($${Left.asmName} + $${offsetVarName}) $${RightMem.FlatMem.asmName}\n`
            freeIfItIsNew(RightMem)
            return RightMem.asmCode + assemblyCode
        }
    }

    /** Left type is 'register', 'long' or ''structRef', with offset undefined. Right type is 'constant'.
     * Create assembly instruction. */
    function leftRegularOffsetUndefinedAndRightConstantToAsm () : string {
        let newVarName: string
        switch (Right.Offset?.type) {
        case undefined:
            return leftRegularOffsetUndefinedAndRightConstantOffsetUndefinedToAsm()
        case 'constant':
            Right.hexContent = assertNotUndefined(Right.hexContent)
            newVarName = Program.Context.getMemoryObjectByLocation(utils.addHexSimple(Right.Offset.value, Right.hexContent), operationLine).asmName
            return `SET @${Left.asmName} $${newVarName}\n`
        case 'variable':
            throw new Error('Not implemented.')
        }
    }

    function leftRegularOffsetUndefinedAndRightConstantOffsetUndefinedToAsm () : string {
        Right.hexContent = assertNotUndefined(Right.hexContent)
        if (Right.hexContent.length > 17) {
            throw new Error(Program.Context.formatError(operationLine,
                'Overflow on long value assignment (value bigger than 64 bits)'))
        }
        if (Right.hexContent === '0000000000000000') {
            return `CLR @${Left.asmName}\n`
        }
        let optVarName = 'n'
        if (Right.declaration === 'fixed') {
            optVarName = 'f'
        }
        optVarName += Number('0x' + Right.hexContent).toString(10)
        const findOpt = Program.memory.find(MEM => MEM.asmName === optVarName && MEM.hexContent === Right.hexContent)
        if (findOpt) {
            return `SET @${Left.asmName} $${findOpt.asmName}\n`
        }
        return `SET @${Left.asmName} #${Right.hexContent}\n`
    }

    /** Left type is 'register', 'long' or 'structRef', with offset undefined. Right type is 'register', 'long' or
     * 'structRef'. Create assembly instruction. */
    function leftRegularOffsetUndefinedAndRightRegularToAsm () : string {
        let offsetVarName: string
        switch (Right.Offset?.type) {
        case undefined:
            return leftRegularOffsetUndefinedAndRightRegularOffsetUndefinedToAsm()
        case 'constant':
            return leftRegularOffsetUndefinedAndRightRegularOffsetConstantToAsm(Right.Offset)
        case 'variable':
            offsetVarName = Program.Context.getMemoryObjectByLocation(Right.Offset.addr, operationLine).asmName
            return `SET @${Left.asmName} $($${Right.asmName} + $${offsetVarName})\n`
        }
    }

    /** Left type is 'register', 'long' or 'structRef', with offset undefined. Right type is 'register', 'long', or
     * 'structRef' with offset undefined. Create assembly instruction. */
    function leftRegularOffsetUndefinedAndRightRegularOffsetUndefinedToAsm (): string {
        if (utils.isNotValidDeclarationOp(Left.declaration, Right)) {
            throw new Error(`Internal error at line: ${operationLine}.`)
        }
        if (Left.address === Right.address) {
            return ''
        }
        return `SET @${Left.asmName} $${Right.asmName}\n`
    }

    /** Left type is 'register', 'long' or 'structRef', with offset undefined. Right type is 'register', 'long' or
     * 'structRef' with offset constant. Create assembly instruction. */
    function leftRegularOffsetUndefinedAndRightRegularOffsetConstantToAsm (
        RightOffset: OFFSET_MODIFIER_CONSTANT
    ) : string {
        if (RightOffset.value === 0) {
            return `SET @${Left.asmName} $($${Right.asmName})\n`
        }
        const MemOffset = flattenMemory(Program, utils.createConstantMemObj(RightOffset.value), operationLine)
        const assemblyCode = `SET @${Left.asmName} $($${Right.asmName} + $${MemOffset.FlatMem.asmName})\n`
        freeIfItIsNew(MemOffset)
        return MemOffset.asmCode + assemblyCode
    }

    /** Left type is 'register', 'long' or 'structRef', with offset undefined. Right type is 'array'.
     * Create assembly instruction. */
    function leftRegularOffsetUndefinedAndRightArrayToAsm (): string {
        if (Right.Offset === undefined) {
            return `SET @${Left.asmName} $${Right.asmName}\n`
        }
        if (Right.Offset.type === 'constant') {
            const memLoc = utils.addHexSimple(Right.hexContent, Right.Offset.value)
            const RightMem = Program.Context.getMemoryObjectByLocation(memLoc, operationLine)
            return `SET @${Left.asmName} $${RightMem.asmName}\n`
        }
        // Right.Offset.type is 'variable'
        const offsetVarName = Program.Context.getMemoryObjectByLocation(Right.Offset.addr, operationLine).asmName
        Program.Context.freeRegister(Right.Offset.addr)
        return `SET @${Left.asmName} $($${Right.asmName} + $${offsetVarName})\n`
    }

    /** Left type is 'register', 'long' or 'structRef', with offset constant. Create assembly instruction. */
    function leftRegularOffsetConstantToAsm (LeftOffset: OFFSET_MODIFIER_CONSTANT) : string {
        const RightMem = flattenMemory(Program, Right, operationLine)
        let assemblyCode: string
        if (LeftOffset.value === 0) {
            assemblyCode = `SET @($${Left.asmName}) $${RightMem.FlatMem.asmName}\n`
            if (RightMem.isNew) {
                Program.Context.freeRegister(RightMem.FlatMem.address)
            }
            return RightMem.asmCode + assemblyCode
        }
        const MemOffset = flattenMemory(Program, utils.createConstantMemObj(LeftOffset.value), operationLine)
        assemblyCode = `SET @($${Left.asmName} + $${MemOffset.FlatMem.asmName}) $${RightMem.FlatMem.asmName}\n`
        freeIfItIsNew(MemOffset)
        freeIfItIsNew(RightMem)
        return RightMem.asmCode + MemOffset.asmCode + assemblyCode
    }

    /** Left type is 'array'. Create assembly instruction. */
    function leftArrayToAsm (): string {
        let RightMem: FLATTEN_MEMORY_RETURN_OBJECT
        let assemblyCode: string
        let leftOffsetVarName: string
        switch (Left.Offset?.type) {
        case undefined:
            return leftArrayOffsetUndefinedToAsm()
        case 'constant':
            // Optimimization steps before lead to impossible reach code
            throw new Error(`Internal error at line: ${operationLine}.`)
        case 'variable':
            RightMem = flattenMemory(Program, Right, operationLine)
            leftOffsetVarName = Program.Context.getMemoryObjectByLocation(Left.Offset.addr, operationLine).asmName
            assemblyCode = `SET @($${Left.asmName} + $${leftOffsetVarName}) $${RightMem.FlatMem.asmName}\n`
            freeIfItIsNew(RightMem)
            return RightMem.asmCode + assemblyCode
        }
    }

    /** Left type is 'array', with offset undefined. Create assembly instruction. */
    function leftArrayOffsetUndefinedToAsm (): string {
        assertExpression(Right.type === 'constant',
            `Internal error at line: ${operationLine}.`)
        // special case for multi-long text assignment
        const arraySize = assertNotUndefined(Left.ArrayItem).totalSize - 1
        if (Right.size > arraySize) {
            throw new Error(Program.Context.formatError(operationLine,
                'Overflow on array value assignment (value bigger than array size).'))
        }
        const paddedLong = assertNotUndefined(Right.hexContent).padStart(arraySize * 16, '0')
        let assemblyCode = ''
        for (let i = 0; i < arraySize; i++) {
            const newLeft = Program.Context.getMemoryObjectByLocation(utils.addHexSimple(Left.hexContent, i), operationLine)
            const newRight = utils.createConstantMemObj(
                paddedLong.slice(16 * (arraySize - i - 1), 16 * (arraySize - i))
            )
            assemblyCode += assignmentToAsm(Program, newLeft, newRight, operationLine)
        }
        return assemblyCode
    }

    function freeIfItIsNew (FlatObj: FLATTEN_MEMORY_RETURN_OBJECT): void {
        if (FlatObj.isNew) {
            Program.Context.freeRegister(FlatObj.FlatMem.address)
        }
    }

    return assignmentToAsmMain()
}
