import Project from "ts-simple-ast";
import {Statement} from 'ts-simple-ast';
import {SyntaxKind} from "ts-simple-ast/dist/typescript/typescript";

let tmpInterfaceCount = 0;

const interfaceMap = new Map();
const enumMap = new Map();
const heritMap = new Map();

let globalCustomRule: any = null;

const deliverDataFromInterface = (name: string): any => {
    const arr = interfaceMap.get(name);
    const heritage = heritMap.get(name);
    let ret: any = {};

    if (heritage) {
        ret = deliverDataFromInterface(heritage);
    }

    if (arr) {
        arr.forEach((elm: any) => {
            const regen = deliverKeyValue(elm.node);
            ret[regen.key] = regen.value;
        });
        return ret;
    }

    const enumType = enumMap.get(name);
    if (enumType) {
        const len = enumType.length;
        return enumType[Math.floor(Math.random() * len)];

    }
    return '';
};

const findFirst = (nodeList: Statement[], type: SyntaxKind): number => {
    return nodeList.findIndex((node) => {
        return node.getKind() === type;
    });
};

const deliverValueFromType = (node: Statement, keyString: string): any => {
    // todo: add hook for special
    const kind = node.getKind();

    if (globalCustomRule) {
        const {hit, result} = globalCustomRule(node, keyString);
        if (hit) {
            return result;
        }
    }

    switch (kind) {
        case SyntaxKind.NumberKeyword:
            return Math.floor(Math.random() * 10000);

        case SyntaxKind.StringKeyword:
            return Buffer.from((Math.random() * 10000).toString()).toString('base64');

        case SyntaxKind.ArrayType:
            const length = Math.floor(Math.random() * 3 + 3);
            const result = [];
            for (let i = 0; i < length; i++) {
                result.push(deliverValueFromType(node.getChildren()[0] as any, keyString));
            }
            return result;

        case SyntaxKind.TypeReference:
            return deliverDataFromInterface(node.getChildren()[0].getText());

        case SyntaxKind.TypeLiteral:
            const tmpName = 'tmpInterface' + tmpInterfaceCount.toString();
            interfaceMap.set(tmpName, []);
            tmpInterfaceCount += 1;
            parseSyntaxList(node.getChildren()[1] as any, tmpName);
            return deliverDataFromInterface(tmpName);

        case SyntaxKind.UnionType:
            const unionTypes = node.getChildren()[0].getChildren();
            const selectable = unionTypes.filter((type) => {
                return type.getKind() !== SyntaxKind.BarToken;
            });
            const pickIndex = Math.floor(Math.random() * selectable.length);
            return deliverValueFromType(selectable[pickIndex] as any, keyString);

        case SyntaxKind.NullKeyword:
            return null;
    }

    return node.getText()
};

const deliverKeyValue = (node: Statement) => {
    let key = '';
    const nodeChildren = node.getChildren();
    const colonIndex = findFirst(nodeChildren as any, SyntaxKind.ColonToken);
    if (colonIndex != -1) {
        let idIndex = colonIndex - 1;
        while (idIndex >= 0 && nodeChildren[idIndex].getKind() !== SyntaxKind.Identifier) {
            idIndex -= 1;
        }
        key = nodeChildren[idIndex].getText();
    }
    const type = nodeChildren[colonIndex + 1];
    let value = deliverValueFromType(type as any, key);
    return {
        key,
        value,
        node
    };
};

const parseEnumMember = (node: Statement): number => {
    const nodeChildren = node.getChildren();
    const id = findFirst(nodeChildren as any, SyntaxKind.NumericLiteral);
    return id >= 0 ? parseInt(nodeChildren[id].getText()) : 0;
};

const parseEnumSyntaxList = (node: Statement, baseEnumName: string) => {
    const nodeChildren = node.getChildren();
    let ret: number[] = [];
    nodeChildren.forEach((syntaxnode) => {
        if (syntaxnode.getKind() === SyntaxKind.EnumMember) {
            ret.push(parseEnumMember(syntaxnode as any));
        }
    });
    enumMap.set(baseEnumName, ret);
};

const parseSyntaxList = (node: Statement, baseInterfaceName: string) => {
    const nodeChildren = node.getChildren();
    nodeChildren.forEach((syntaxnode) => {
        if (syntaxnode.getKind() === SyntaxKind.PropertySignature) {
            let vElem = interfaceMap.get(baseInterfaceName);
            vElem.push(deliverKeyValue(syntaxnode as any));
            interfaceMap.set(baseInterfaceName, vElem);
        }
    })
};

const walk = (stmt: Statement, prefix: string) => {
    let ext = '';
    if (stmt.getKindName() === 'InterfaceKeyword') {
        const id = stmt.getNextSiblingIfKind(SyntaxKind.Identifier);
        if (id) {
            const interfaceName = id.getText();
            ext += ' ' + interfaceName;
            interfaceMap.set(interfaceName, []);

            const interfaceSiblings = id.getNextSiblings();
            let indexOfOpenBrace = findFirst(interfaceSiblings as any, SyntaxKind.OpenBraceToken);

            // extends

            if (indexOfOpenBrace >= 1 && interfaceSiblings[indexOfOpenBrace - 1].getKind() === SyntaxKind.SyntaxList) {
                const syntaxList = interfaceSiblings[indexOfOpenBrace - 1];
                const syntaxChildren = syntaxList.getChildren();
                const hcIndex = findFirst(syntaxChildren as any, SyntaxKind.HeritageClause);
                const hcChildren = syntaxChildren[hcIndex].getChildren();
                const baseInterfaceId = findFirst(hcChildren as any, SyntaxKind.SyntaxList);
                const baseInterfaceChildren = hcChildren[baseInterfaceId].getChildren();
                heritMap.set(interfaceName, baseInterfaceChildren[0].getChildren()[0].getText());
            }

            while (indexOfOpenBrace !== -1 && indexOfOpenBrace < interfaceSiblings.length) {
                if (interfaceSiblings[indexOfOpenBrace].getKind() === SyntaxKind.SyntaxList) {
                    parseSyntaxList(interfaceSiblings[indexOfOpenBrace] as any, interfaceName);
                }
                indexOfOpenBrace += 1;
            }
        }
    }

    if (stmt.getKind() === SyntaxKind.EnumKeyword) {
        const id = stmt.getNextSiblingIfKind(SyntaxKind.Identifier);
        if (id) {
            const enumName = id.getText();
            ext += ' ' + enumName;
            enumMap.set(enumName, []);

            const enumSiblings = id.getNextSiblings();
            let indexOfOpenBrace = findFirst(enumSiblings as any, SyntaxKind.OpenBraceToken);

            while (indexOfOpenBrace !== -1 && indexOfOpenBrace < enumSiblings.length) {
                if (enumSiblings[indexOfOpenBrace].getKind() === SyntaxKind.SyntaxList) {
                    parseEnumSyntaxList(enumSiblings[indexOfOpenBrace] as any, enumName);
                }
                indexOfOpenBrace += 1;
            }
        }
    }
    // console.log(prefix + stmt.getKindName() + ext);
    const children = stmt.getChildren();
    children.forEach((child) => {
        walk((child as any), '  ' + prefix);
    })
};

export function generateData(
    inputPath: string,
    interfaceNames: string[],
    customizeRule?: (node: Statement, keyString: string) => {hit: boolean, result: any}) {

    globalCustomRule = customizeRule;

    const project = new Project();

    project.addExistingSourceFiles(inputPath);
    const stmts = project.getSourceFiles()[0].getStatements();

    stmts.forEach((stmt) => {
        walk(stmt, '');
    });

    interfaceNames.forEach((interfaceName) => {
        console.log(`const ${interfaceName}Data = `
            + JSON.stringify(deliverDataFromInterface(interfaceName), null, 4)
            + ';');
    });

    project.saveSync();
}

// generateData("./src/service/api-common.ts", ['UncensoredTaskListResp', 'UncensoredTaskDetailResp'],
//     (node: Statement, keyString: string) => {
//         if (keyString.match(/url$/i)) {
//             return {
//                 hit: true,
//                 result: 'http://atrueurl'
//             };
//         }
//         return {
//             hit: false,
//             result: null
//         }
//     });