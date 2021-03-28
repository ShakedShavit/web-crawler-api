class Node {
    constructor(data) {
        this.data = data,
            this.children = []
    }

    add(data) {
        this.children.push(data);
    }

    remove(data) {
        this.children = this.children.filter(child => child.data !== data);
    }
}

class Tree {
    constructor() {
        this.root = null;
    }

    traverseBF(value) {
        let collection = [this.root];

        while (collection.length) {
            let node = collection.shift();

            if (node.data === value) {
                return true;
            } else {
                collection.push(...node.children);
            }
        }
        return false;
    }
}