## ts-interface-analyzer

该工具主要用于根据interface的内容生成数据。
支持的数据类型有

- 基本类型：number, string, null
- 枚举类型
- 字面量Object
- 引用别的interface
- 继承别的interface

不支持的类型

- class
- function
- 泛型

使用方法：

```javascript
const t = require('ts-interface-analyzer');
t.generateData(filePath, interfaceNames, customizeRules);

// 第一个参数 传入文件目录
// 第二个参数 为一个array，里面写了需要输出模拟数据的interface名称
// 第三个参数 可选 输入自定义的解析规则，可以根据node和key的名称决定特殊规则，如url，email等

例子：

const t = require('ts-interface-analyzer');
t.generateData("./service/api-common.ts", ['XXXResp', 'XXXXResp'],
    (node: any, keyString: string) => {
        if (keyString.match(/url$/i)) { // 是url的情况
            return {
                hit: true,
                result: 'https://xxxxxxx/1498147059727143472281.png'
            };
        }

        if (keyString === 'commodityName') {
            return {
                hit: true,
                result: ['阔落', '雪碧', '芬达', '橙汁'][Math.floor(Math.random() * 4)]
            }
        }
        return {
            hit: false,
            result: null
        }
    });
```