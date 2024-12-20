// @see https://gist.github.com/juliusmarminge/b06a3e421117a56ba1fea54e2a4c0fcb

import PrismaGenHelper from '@prisma/generator-helper';
import fs from 'node:fs/promises';
import path from 'node:path';

const header = `// This file was generated by a custom prisma generator, do not edit manually.\n`;

PrismaGenHelper.generatorHandler({
  onManifest() {
    return {
      defaultOutput: './enums/index.ts',
      prettyName: 'Enum Objects',
    };
  },
  async onGenerate(options) {
    const enums = options.dmmf.datamodel.enums;

    const output = enums.map((e) => {
      let enumString = `export const ${e.name} = {\n`;
      e.values.forEach(({ name: value }) => {
        enumString += `  ${value}: '${value}',\n`;
      });
      enumString += `} as const;\n\n`;
      enumString += `export type ${e.name} = (typeof ${e.name})[keyof typeof ${e.name}];\n`;

      return enumString;
    });

    const outputFile = options.generator.output;
    if (!outputFile || !outputFile.value) {
      throw new Error('No output file specified');
    }

    const outputPath = path.resolve(outputFile.value);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, header + output.join('\n'), 'utf-8');
  },
});
