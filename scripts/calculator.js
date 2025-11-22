export default {
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
  function: async (args) => {
    const { numbers } = args;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return { sum };
  },
};
