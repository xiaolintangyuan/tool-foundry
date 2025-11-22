interface AddArgs {
    numbers: number[];
}

interface SubtractArgs {
    numbers: number[];
}

interface MultiplyArgs {
    numbers: number[];
}

interface DivideArgs {
    numbers: number[];
}

export const addTool = {
    name: 'add',
    description: 'Add the numbers in args array and return the sum',
    parameters: {
        type: 'object',
        properties: {
            numbers: {
                type: 'array',
                items: {
                    type: 'number',
                },
                description: 'Array of numbers to add',
            },
        },
        required: ['numbers'],
    },
    function: async (args: AddArgs): Promise<{ sum: number }> => {
        const { numbers } = args;
        const sum = numbers.reduce((acc, num) => acc + num, 0);
        console.log(`[add] Tool used:${sum}`);
        return { sum };
    },
};

export const subtractTool = {
    name: 'subtract',
    description: 'Subtract the numbers in args array and return the difference',
    parameters: {
        type: 'object',
        properties: {
            numbers: {
                type: 'array',
                items: {
                    type: 'number',
                },
                description: 'Array of numbers to subtract',
            },
        },
        required: ['numbers'],
    },
    function: async (args: SubtractArgs): Promise<{ difference: number }> => {
        const { numbers } = args;
        if (numbers.length === 0) return { difference: 0 };
        const difference = numbers.slice(1).reduce((acc, num) => acc - num, numbers[0]);
        console.log(`[subtract] Tool used:${difference}`);
        return { difference };
    },
};

export const multiplyTool = {
    name: 'multiply',
    description: 'Multiply the numbers in args array from left to right and return the product',
    parameters: {
        type: 'object',
        properties: {
            numbers: {
                type: 'array',
                items: {
                    type: 'number',
                },
                description: 'Array of numbers to multiply',
            },
        },
        required: ['numbers'],
    },
    function: async (args: MultiplyArgs): Promise<{ product: number }> => {
        const { numbers } = args;
        const product = numbers.reduce((acc, num) => acc * num, 1);
        console.log(`[multiply] Tool used:${product}`);
        return { product };
    },
};

export const divideTool = {
    name: 'divide',
    description: 'Divide the numbers in args array from left to right and return the quotient',
    parameters: {
        type: 'object',
        properties: {
            numbers: {
                type: 'array',
                items: {
                    type: 'number',
                },
                description: 'Array of numbers to divide',
            },
        },
        required: ['numbers'],
    },
    function: async (args: DivideArgs): Promise<{ quotient: number }> => {
        const { numbers } = args;
        if (numbers.length === 0) return { quotient: 0 };
        const quotient = numbers.slice(1).reduce((acc, num) => acc / num, numbers[0]);
        console.log(`[divide] Tool used:${quotient}`);
        return { quotient };
    },
};

export default {
    addTool,
    subtractTool,
    multiplyTool,
    divideTool,
}