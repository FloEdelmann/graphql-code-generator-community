import { extname } from 'path';
import { concatAST, FragmentDefinitionNode, GraphQLSchema, Kind } from 'graphql';
import { oldVisit, PluginFunction, PluginValidateFn, Types } from '@graphql-codegen/plugin-helpers';
import { LoadedFragment } from '@graphql-codegen/visitor-plugin-common';
import { StencilApolloRawPluginConfig } from './config.js';
import { StencilApolloVisitor } from './visitor.js';

export const plugin: PluginFunction<StencilApolloRawPluginConfig> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: StencilApolloRawPluginConfig,
) => {
  const allAst = concatAST(documents.map(v => v.document));

  const allFragments: LoadedFragment[] = [
    ...(
      allAst.definitions.filter(
        d => d.kind === Kind.FRAGMENT_DEFINITION,
      ) as FragmentDefinitionNode[]
    ).map(fragmentDef => ({
      node: fragmentDef,
      name: fragmentDef.name.value,
      onType: fragmentDef.typeCondition.name.value,
      isExternal: false,
    })),
    ...(config.externalFragments || []),
  ];

  const visitor = new StencilApolloVisitor(schema, allFragments, config);
  const visitorResult = oldVisit(allAst, { leave: visitor });

  return {
    prepend: visitor.getImports(),
    content: [
      '',
      visitor.fragments,
      ...visitorResult.definitions.filter(t => typeof t === 'string'),
    ].join('\n'),
  };
};

export const validate: PluginValidateFn<any> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: StencilApolloRawPluginConfig,
  outputFile: string,
) => {
  if (extname(outputFile) !== '.tsx') {
    throw new Error(`Plugin "stencil-apollo" requires extension to be ".tsx"!`);
  }
};

export { StencilApolloVisitor };
