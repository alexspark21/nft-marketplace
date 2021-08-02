
# ERC-721 Token — Reference Implementation

This is the complete reference implementation of the [ERC-721](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md) non-fungible token standard for the Ethereum and Wanchain blockchains. This is an open-source project, complete with [Specron](https://specron.github.io/framework/) testing.

The purpose of this implementation is to provide a good starting point for anyone who wants to use and develop non-fungible tokens on the Ethereum and Wanchain blockchains. Instead of re-implementing the ERC-721 yourself you can use this code which has gone through multiple audits and we hope it will be extensively used by the community in the future.

If you are looking for a more feature-rich and advanced ERC721 implementation, then check out the [0xcert Framework](https://github.com/0xcert/framework).

## Structure

All contracts and tests are in the [src](src/) folder. There are multiple implementations and you can select between:

- [`nf-token.sol`](src/contracts/tokens/nf-token.sol): This is the base ERC-721 token implementation (with support for ERC-165).
- [`nf-token-metadata.sol`](src/contracts/tokens/nf-token-metadata.sol): This implements optional ERC-721 metadata features for the token contract. It implements a token name, a symbol and a distinct URI pointing to a publicly exposed ERC-721 JSON metadata file.
- [`nf-token-enumerable.sol`](src/contracts/tokens/nf-token-enumerable.sol): This implements optional ERC-721 support for enumeration. It is useful if you want to know the total supply of tokens, to query a token by index, etc.

Other files in the [tokens](src/contracts/tokens) and [utils](src/contracts/utils) directories named `erc*.sol` are interfaces and define the respective standards.

Mock contracts showing basic contract usage are available in the [mocks](src/contracts/mocks) folder.

There are also test mocks that can be seen [here](src/tests/mocks). These are specifically made to test different edge cases and behaviours and should NOT be used as a reference for implementation.

## Requirements

* NodeJS 9.0+ is supported
* Windows, Linux or macOS

## Installation

### npm

*This is the recommended installation method if you want to use this package in your JavaScript project.*

This project is [released as an npm module](https://www.npmjs.com/package/@0xcert/ethereum-erc721). You must install it using the `npm` command:

```
$ npm install @alexspark21/nft-marketplace@2.0.0
```

### Source

*This is the recommended installation method if you want to improve the `alexspark21/nft-marketplace` project.*

Clone this repository and install the required `npm` dependencies:

```
$ git clone git@github.com:alexspark21/nft-marketplace.git
$ cd nft-marketplace
$ npm install
```

Make sure that everything has been set up correctly:

```
$ npm run test
```

## Licence

See [LICENSE](./LICENSE) for details.
