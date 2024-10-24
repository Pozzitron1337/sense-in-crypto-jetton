import "./jetton";

message Mint {
    amount: Int;
    receiver: Address;
}

message TransferOwnership {
    newOwner: Address;
}

message AcceptOwnership {

}

contract SenseInCryptoJetton with Jetton {
    total_supply: Int as coins;
    owner: Address;
    pending_owner: Address;
    content: Cell;
    mintable: Bool;

    init(owner: Address, content: Cell) {
        self.total_supply = 0;
        self.owner = owner;
        self.mintable = true;
        self.content = content;
        self.pending_owner = newAddress(0,0); // nobody
    }

    receive(msg: Mint) { // 0xfc708bd2
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");
        require(self.mintable, "Not mintable");
        self.mint(msg.receiver, msg.amount, self.owner); // (to, amount, response_destination)
    }

    receive (msg: TransferOwnership) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");
        self.pending_owner = msg.newOwner;
    }

    receive (msg: AcceptOwnership) {
        let ctx: Context = context();
        require(ctx.sender == self.pending_owner, "Not pending owner");
        self.owner = ctx.sender;
        self.pending_owner = newAddress(0,0);
    }
    
}