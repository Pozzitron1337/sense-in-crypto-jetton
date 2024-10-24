import { Sha256 } from "@aws-crypto/sha256-js";
import { Dictionary, beginCell, Cell } from "@ton/core";

const ONCHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;
const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);

const sha256 = (str: string) => {
    const sha = new Sha256();
    sha.update(str);
    return Buffer.from(sha.digestSync());
};

const toKey = (key: string) => {
    return BigInt(`0x${sha256(key).toString("hex")}`);
};

export function buildOnchainMetadata(data: { name: string; description: string; image: string }): Cell {
    let dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    // Store the on-chain metadata in the dictionary
    Object.entries(data).forEach(([key, value]) => {
        dict.set(toKey(key), makeSnakeCell(Buffer.from(value, "utf8")));
    });

    return beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8).storeDict(dict).endCell();
}

export function makeSnakeCell(data: Buffer) {
    // Create a cell that package the data
    let chunks = bufferToChunks(data, CELL_MAX_SIZE_BYTES);

    const b = chunks.reduceRight((curCell, chunk, index) => {
        if (index === 0) {
            curCell.storeInt(SNAKE_PREFIX, 8);
        }
        curCell.storeBuffer(chunk);
        if (index > 0) {
            const cell = curCell.endCell();
            return beginCell().storeRef(cell);
        } else {
            return curCell;
        }
    }, beginCell());
    return b.endCell();
}

function bufferToChunks(buff: Buffer, chunkSize: number) {
    let chunks: Buffer[] = [];
    while (buff.byteLength > 0) {
        chunks.push(buff.slice(0, chunkSize));
        buff = buff.slice(chunkSize);
    }
    return chunks;
}

//////////////////////////////////

/// SHIT CODE in function parseToJSON. There should be another way to convert string like that:
// x{00C_}
// x{2_}
//  x{BFF082EB663B57A00192F4A6AC467288DF2DFEDDB9DA1BEE28F6521C8BEBD21F1EC_}
//   x{0068747470733A2F2F7261772E67697468756275736572636F6E74656E742E636F6D2F506F7A7A6974726F6E313333372F73656E73652D696E2D63727970746F2E6C6F676F2F726566732F68656164732F6D61696E2F73656E73652D696E2D63727970746F2E6A7067}
//  x{2_}
//   x{2_}
//    x{BF4546A6FFE1B79CFDD86BAD3DB874313DCDE2FB05E6A74AA7F3552D9617C79D13_}
//     x{0053656E736520496E2043727970746F20436F696E}
//    x{BF6ED4F942A7848CE2CB066B77A1128C6A1FF8C43F438A2DCE24612BA9FFAB8B03_}
//     x{0053494343}
//   x{BF89046F7A37AD0EA7CEE73355984FA5428982F8B37C8F7BCEC91F7AC71A7CD104}
//    x{00546865206D656D626572206F662074686520636F6D6D756E69747920686F6C64207468652053656E736520496E2043727970746F20436F696E}
// To pretty json: 
//  {
//    image: 'https://raw.githubusercontent.com/Pozzitron1337/sense-in-crypto-jetton/refs/heads/logo/sense-in-crypto.jpg',
//    name: 'Sense In Crypto Coin',
//    symbol: 'SICC',
//    description: 'The member of the community hold the Sense In Crypto Coin'
//  }
export function parseToJSON(input: any) {
    function hexToString(hex: any) {
        return Buffer.from(hex, 'hex').toString('utf8').replace('\x00', '');
    }
    
    const regex = /x{([0-9A-Fa-f]+)}/g;
    
    const matches = Array.from(input.matchAll(regex), (m: RegExpMatchArray) => m[1]);
    console.log(matches)
    const json = {
        image: hexToString(matches[0]),
        name: hexToString(matches[1]),
        symbol: hexToString(matches[2]),
        description: hexToString(matches[4])
    };

    return json;
}