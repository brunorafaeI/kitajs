import { AstCollector, InvalidProviderGenericTypeError, Parameter, ParameterParser, Route } from '@kitajs/common';
import { ts } from 'ts-json-schema-generator';
import { getParameterGenerics, getTypeNodeName } from '../util/nodes';
import { joinParameters } from '../util/syntax';
import { ProviderGenericsParameterParser } from './provider-generics';

export class ProviderParameterParser implements ParameterParser {
  agnostic = true;

  constructor(private collector: AstCollector) {}

  supports(param: ts.ParameterDeclaration) {
    const name = getTypeNodeName(param);
    return !!name && !!this.collector.getProvider(name);
  }

  parse(param: ts.ParameterDeclaration, _route: Route, _node: ts.FunctionDeclaration, index: number): Parameter {
    const name = getTypeNodeName(param)!;
    const provider = this.collector.getProvider(name)!;

    const providerGenericsIndex = provider.parameters.findIndex((p) => p.name === ProviderGenericsParameterParser.name);

    // Changes the default [] to the generics passed to the Provider
    if (providerGenericsIndex !== -1) {
      const generics = getParameterGenerics(param);
      const arr = [];

      for (const generic of generics) {
        // 01, 'str', true
        if (!ts.isLiteralTypeNode(generic)) {
          throw new InvalidProviderGenericTypeError(generic);
        }

        arr.push(generic.literal.getText());
      }

      provider.parameters[providerGenericsIndex]!.value = `[${arr.join(', ')}]`;
    }

    const value = `param${index + provider.parameters.length}`;

    return {
      name: ProviderParameterParser.name,
      value,
      imports: [{ name: provider.type, path: provider.providerPath }].concat(
        provider.parameters.flatMap((p) => p.imports || [])
      ),
      schemaTransformer:
        provider.schemaTransformer &&
        (providerGenericsIndex !== -1
          ? [provider.parameters[providerGenericsIndex]!.value]
          : provider.schemaTransformer),
      providerName: provider.type,
      helper: `${joinParameters(provider.parameters)}
const ${value} = ${provider.async ? 'await ' : ''}${provider.type}.default(${provider.parameters
        .map((p) => p.value)
        .join(',')});`.trim()
    };
  }
}
