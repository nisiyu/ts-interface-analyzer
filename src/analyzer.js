"use strict";
exports.__esModule = true;
var ts_simple_ast_1 = require("ts-simple-ast");
var typescript_1 = require("ts-simple-ast/dist/typescript/typescript");
var tmpInterfaceCount = 0;
var interfaceMap = new Map();
var enumMap = new Map();
var heritMap = new Map();
var globalCustomRule = null;
var deliverDataFromInterface = function (name) {
    var arr = interfaceMap.get(name);
    var heritage = heritMap.get(name);
    var ret = {};
    if (heritage) {
        ret = deliverDataFromInterface(heritage);
    }
    if (arr) {
        arr.forEach(function (elm) {
            var regen = deliverKeyValue(elm.node);
            ret[regen.key] = regen.value;
        });
        return ret;
    }
    var enumType = enumMap.get(name);
    if (enumType) {
        var len = enumType.length;
        return enumType[Math.floor(Math.random() * len)];
    }
    return '';
};
var findFirst = function (nodeList, type) {
    return nodeList.findIndex(function (node) {
        return node.getKind() === type;
    });
};
var deliverValueFromType = function (node, keyString) {
    // todo: add hook for special
    var kind = node.getKind();
    if (globalCustomRule) {
        var _a = globalCustomRule(node, keyString), hit = _a.hit, result = _a.result;
        if (hit) {
            return result;
        }
    }
    switch (kind) {
        case typescript_1.SyntaxKind.NumberKeyword:
            return Math.floor(Math.random() * 10000);
        case typescript_1.SyntaxKind.StringKeyword:
            return Buffer.from((Math.random() * 10000).toString()).toString('base64');
        case typescript_1.SyntaxKind.ArrayType:
            var length_1 = Math.floor(Math.random() * 3 + 3);
            var result = [];
            for (var i = 0; i < length_1; i++) {
                result.push(deliverValueFromType(node.getChildren()[0], keyString));
            }
            return result;
        case typescript_1.SyntaxKind.TypeReference:
            return deliverDataFromInterface(node.getChildren()[0].getText());
        case typescript_1.SyntaxKind.TypeLiteral:
            var tmpName = 'tmpInterface' + tmpInterfaceCount.toString();
            interfaceMap.set(tmpName, []);
            tmpInterfaceCount += 1;
            parseSyntaxList(node.getChildren()[1], tmpName);
            return deliverDataFromInterface(tmpName);
        case typescript_1.SyntaxKind.UnionType:
            var unionTypes = node.getChildren()[0].getChildren();
            var selectable = unionTypes.filter(function (type) {
                return type.getKind() !== typescript_1.SyntaxKind.BarToken;
            });
            var pickIndex = Math.floor(Math.random() * selectable.length);
            return deliverValueFromType(selectable[pickIndex], keyString);
        case typescript_1.SyntaxKind.NullKeyword:
            return null;
    }
    return node.getText();
};
var deliverKeyValue = function (node) {
    var key = '';
    var nodeChildren = node.getChildren();
    var colonIndex = findFirst(nodeChildren, typescript_1.SyntaxKind.ColonToken);
    if (colonIndex != -1) {
        var idIndex = colonIndex - 1;
        while (idIndex >= 0 && nodeChildren[idIndex].getKind() !== typescript_1.SyntaxKind.Identifier) {
            idIndex -= 1;
        }
        key = nodeChildren[idIndex].getText();
    }
    var type = nodeChildren[colonIndex + 1];
    var value = deliverValueFromType(type, key);
    return {
        key: key,
        value: value,
        node: node
    };
};
var parseEnumMember = function (node) {
    var nodeChildren = node.getChildren();
    var id = findFirst(nodeChildren, typescript_1.SyntaxKind.NumericLiteral);
    return id >= 0 ? parseInt(nodeChildren[id].getText()) : 0;
};
var parseEnumSyntaxList = function (node, baseEnumName) {
    var nodeChildren = node.getChildren();
    var ret = [];
    nodeChildren.forEach(function (syntaxnode) {
        if (syntaxnode.getKind() === typescript_1.SyntaxKind.EnumMember) {
            ret.push(parseEnumMember(syntaxnode));
        }
    });
    enumMap.set(baseEnumName, ret);
};
var parseSyntaxList = function (node, baseInterfaceName) {
    var nodeChildren = node.getChildren();
    nodeChildren.forEach(function (syntaxnode) {
        if (syntaxnode.getKind() === typescript_1.SyntaxKind.PropertySignature) {
            var vElem = interfaceMap.get(baseInterfaceName);
            vElem.push(deliverKeyValue(syntaxnode));
            interfaceMap.set(baseInterfaceName, vElem);
        }
    });
};
var walk = function (stmt, prefix) {
    var ext = '';
    if (stmt.getKindName() === 'InterfaceKeyword') {
        var id = stmt.getNextSiblingIfKind(typescript_1.SyntaxKind.Identifier);
        if (id) {
            var interfaceName = id.getText();
            ext += ' ' + interfaceName;
            interfaceMap.set(interfaceName, []);
            var interfaceSiblings = id.getNextSiblings();
            var indexOfOpenBrace = findFirst(interfaceSiblings, typescript_1.SyntaxKind.OpenBraceToken);
            // extends
            if (indexOfOpenBrace >= 1 && interfaceSiblings[indexOfOpenBrace - 1].getKind() === typescript_1.SyntaxKind.SyntaxList) {
                var syntaxList = interfaceSiblings[indexOfOpenBrace - 1];
                var syntaxChildren = syntaxList.getChildren();
                var hcIndex = findFirst(syntaxChildren, typescript_1.SyntaxKind.HeritageClause);
                var hcChildren = syntaxChildren[hcIndex].getChildren();
                var baseInterfaceId = findFirst(hcChildren, typescript_1.SyntaxKind.SyntaxList);
                var baseInterfaceChildren = hcChildren[baseInterfaceId].getChildren();
                heritMap.set(interfaceName, baseInterfaceChildren[0].getChildren()[0].getText());
            }
            while (indexOfOpenBrace !== -1 && indexOfOpenBrace < interfaceSiblings.length) {
                if (interfaceSiblings[indexOfOpenBrace].getKind() === typescript_1.SyntaxKind.SyntaxList) {
                    parseSyntaxList(interfaceSiblings[indexOfOpenBrace], interfaceName);
                }
                indexOfOpenBrace += 1;
            }
        }
    }
    if (stmt.getKind() === typescript_1.SyntaxKind.EnumKeyword) {
        var id = stmt.getNextSiblingIfKind(typescript_1.SyntaxKind.Identifier);
        if (id) {
            var enumName = id.getText();
            ext += ' ' + enumName;
            enumMap.set(enumName, []);
            var enumSiblings = id.getNextSiblings();
            var indexOfOpenBrace = findFirst(enumSiblings, typescript_1.SyntaxKind.OpenBraceToken);
            while (indexOfOpenBrace !== -1 && indexOfOpenBrace < enumSiblings.length) {
                if (enumSiblings[indexOfOpenBrace].getKind() === typescript_1.SyntaxKind.SyntaxList) {
                    parseEnumSyntaxList(enumSiblings[indexOfOpenBrace], enumName);
                }
                indexOfOpenBrace += 1;
            }
        }
    }
    // console.log(prefix + stmt.getKindName() + ext);
    var children = stmt.getChildren();
    children.forEach(function (child) {
        walk(child, '  ' + prefix);
    });
};
function generateData(inputPath, interfaceNames, customizeRule) {
    globalCustomRule = customizeRule;
    var project = new ts_simple_ast_1["default"]();
    project.addExistingSourceFiles(inputPath);
    var stmts = project.getSourceFiles()[0].getStatements();
    stmts.forEach(function (stmt) {
        walk(stmt, '');
    });
    interfaceNames.forEach(function (interfaceName) {
        console.log("const " + interfaceName + "Data = "
            + JSON.stringify(deliverDataFromInterface(interfaceName), null, 4)
            + ';');
    });
    project.saveSync();
}
exports.generateData = generateData;
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
