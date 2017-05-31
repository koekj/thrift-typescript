import {
  createLiteral,
  createNull,
  createProperty,

  createHeritageClause,
  createExpressionWithTypeArguments,
  createIdentifier,
  createClassExpression,
  createStatement,

  SyntaxKind,

  PropertyDeclaration,
  ExpressionStatement
} from 'typescript';

import {
  TypeNode,
  resolveTypeNode
} from './typedefs';

import {
  toOptional
} from '../ast-helpers';

import {
  tokens
} from '../ast/tokens';

import {
  getStructs
} from '../get';

import {
  createConstructor,
  createRead,
  createWrite
} from '../create';


export class StructPropertyNode {
  public id?: number; // TODO: success doesn't have an ID?
  public name: string;
  public type: TypeNode;
  public option?: string;
  public defaultValue?: any; // TODO: better type?

  constructor(args) {
    this.id = args.id;
    this.name = args.name;
    this.type = args.type;
    this.option = args.option;
    this.defaultValue = args.defaultValue;
  }

  public toAST(): PropertyDeclaration {

    let _optional = toOptional(this.option);

    let _default;
    if (this.defaultValue != null) {
      _default = createLiteral(this.defaultValue);
    } else {
      _default = createNull();
    }

    // TODO: weird workaround for success
    if (this.name === 'success') {
      _optional = undefined;
      _default = undefined;
    }

    return createProperty(undefined, [tokens.public], this.name, _optional, this.type.toAST(), _default);
  }
}

export class StructNode {
  public name: string;
  public implements: string;
  public fields: StructPropertyNode[];

  constructor(args) {
    this.name = args.name;
    this.implements = args.implements;
    this.fields = args.fields;
  }

  public toAST(): ExpressionStatement {
    const fields = this.fields.map((field) => field.toAST());

    // Build the constructor body
    const ctor = createConstructor(this);

    // Build the `read` method
    const read = createRead(this.fields);

    // Build the `write` method
    const write = createWrite(this);

    const _heritage = createHeritageClause(SyntaxKind.ImplementsKeyword, [
      createExpressionWithTypeArguments(undefined, createIdentifier(this.implements))
    ]);

    const _classExpression = createClassExpression([tokens.export], this.name, [], [_heritage], [
      ...fields,
      ctor,
      read,
      write
    ]);

    const _classStatement = createStatement(_classExpression);

    return _classStatement;
  }
}

export function resolveStructs(idl) {
  const structs = getStructs(idl);

  return structs.map((struct) => {
    const { name } = struct;

    const fields = [{name: 'success', type: 'bool'}].concat(struct.fields)
      .map((field: { id?: number, name: string, type: string, option?: string, defaultValue?: any }) => {
        return new StructPropertyNode({
          id: field.id,
          name: field.name,
          type: resolveTypeNode(idl, field.type),
          option: field.option,
          defaultValue: field.defaultValue
        });
      });

    return new StructNode({
      name: name,
      // TODO: this should be a lookup somehow
      implements: `${name}Interface`,
      fields: fields
    });
  });
}