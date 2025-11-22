interface AddArgs {
  numbers: number[];
}

interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  function: (args: AddArgs) => Promise<{ sum: number }>;
}

const addTool: Tool = {
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
    return { sum };
  },
};

export default addTool;
