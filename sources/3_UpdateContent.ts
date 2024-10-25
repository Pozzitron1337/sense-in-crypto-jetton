import { Address, beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano } from "@ton/ton";

import { buildOnchainMetadata } from "./utils/jetton-helpers";
import { mnemonicToPrivateKey } from "ton-crypto";
import { printAddress, printHeader, printDeploy, printSeparator } from "./utils/print";
import { deploy } from "./utils/deploy";

import { SenseInCryptoJetton, storeMint, storeTokenUpdateContent } from "./output/SenseInCryptoJetton_SenseInCryptoJetton";
import { JettonDefaultWallet, TokenBurn } from "./output/SenseInCryptoJetton_JettonDefaultWallet";

import * as dotenv from "dotenv";
dotenv.config();

// 🔴 Jetton Root Address
let jetton_minter_root = Address.parse("EQBA9GP6pkJFKcKc0JbBErngqmrxRYjAH5Nng_4ZLso-mLTz");
let owner = Address.parse("UQCeMT-zqH2U8sj20mTW8e1qLRNHg-zWJ6bRxJlBsE5dVBZN")

const updatedJettonParams = {
    name: "Sense In Crypto",
    description: "The member of the community hold the Sense In Crypto Coin",
    symbol: "SICC",
    image: "https://raw.githubusercontent.com/Pozzitron1337/sense-in-crypto.logo/refs/heads/main/sense-in-crypto.jpg",
};

(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client4 = new TonClient4({
        // endpoint: "https://sandbox-v4.tonhubapi.com",
        endpoint: "https://mainnet-v4.tonhubapi.com",
    });

    let mnemonics = (process.env.mnemonics || "").toString(); // 🔴 Change to your own, by creating .env file!
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let workchain = 0; //we are working in basechain.
    let deployer_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log(deployer_wallet.address);

    let deployer_wallet_contract = client4.open(deployer_wallet);

    const jettonParamsInit = {
        name: "Sense In Crypto Coin",
        description: "The member of the community hold the Sense In Crypto Coin",
        symbol: "SICC",
        image: "https://raw.githubusercontent.com/Pozzitron1337/sense-in-crypto-jetton/refs/heads/logo/sense-in-crypto.jpg",
    };

    // Create content Cell
    let content = buildOnchainMetadata(jettonParamsInit);

    // Compute init data for deployment
    // NOTICE: the parameters inside the init functions were the input for the contract address
    // which means any changes will change the smart contract address as well
    let init = await SenseInCryptoJetton.init(deployer_wallet_contract.address, content);
    let jettonMaster = contractAddress(workchain, init);
    console.log(jettonMaster)
    
    
    let updatedContent = buildOnchainMetadata(updatedJettonParams)

    let deployAmount = toNano("0.3");
    let packed = beginCell()
        .store(
            storeTokenUpdateContent({
                $$type: "TokenUpdateContent",
                content: updatedContent
            })
        )
        .endCell();
    let seqno: number = await deployer_wallet_contract.getSeqno();
    let balance: bigint = await deployer_wallet_contract.getBalance();
    printSeparator();
    console.log("Current deployment wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("\n🛠️ Calling To JettonMaster:\n" + jettonMaster + "\n");
    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: jettonMaster,
                value: deployAmount,
                init: {
                    code: init.code,
                    data: init.data,
                },
                bounce: true,
                body: packed,
            }),
        ],
    });
})();
