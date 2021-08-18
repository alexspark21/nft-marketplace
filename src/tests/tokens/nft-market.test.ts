import {Context, Spec} from '@specron/spec';
import {BigNumber, ethers} from 'ethers';

/**
 * Spec context interfaces.
 */

interface Data {
  nftContract?: any;
  nftMarketContract?: any;
  owner?: string;
  bob?: string;
  zeroAddress?: string;
  nft1?: any;
  nft2?: any;
}

/**
 * Spec stack instances.
 */

const spec = new Spec<Data>();

export default spec;

spec.beforeEach(async (ctx) => {
  const accounts = await ctx.web3.eth.getAccounts();
  ctx.set('owner', accounts[0]);
  ctx.set('bob', accounts[1]);
  ctx.set('zeroAddress', '0x0000000000000000000000000000000000000000');
});

spec.beforeEach(async (ctx) => {
  const nftMarketContract = await ctx.deploy({
    src: './build/tests/nft-market.json',
    contract: 'NftMarket',
  });
  ctx.set('nftMarketContract', nftMarketContract);

  const nftContract = await ctx.deploy({
    src: './build/tests/nft-item.json',
    contract: 'NftItem',
    args: ['Art token item', 'ATI', nftMarketContract.receipt.contractAddress]
  });
  ctx.set('nftContract', nftContract);
});

spec.beforeEach(async (ctx) => {
  const nftContract = ctx.get('nftContract');
  const owner = ctx.get('owner');

  const nft1 = await nftContract.instance.methods.createToken('http://0xcert.org/1').send({from: owner});
  const nft2 = await nftContract.instance.methods.createToken('http://0xcert.org/2').send({from: owner});

  ctx.set('nft1', nft1);
  ctx.set('nft2', nft2);
});

spec.test('correctly create market item', async (ctx) => {
  const nftContract = ctx.get('nftContract');
  const nftMarketContract = ctx.get('nftMarketContract');

  const owner = ctx.get('owner');

  const nft1 = ctx.get('nft1');
  const nft2 = ctx.get('nft2');

  const nft1TokenId = nft1.events.Transfer.returnValues._tokenId;
  const nft2TokenId = nft2.events.Transfer.returnValues._tokenId;

  const listingPrice = await nftMarketContract.instance.methods.getListingPrice().call();
  const auctionPrice = ethers.utils.parseUnits('1', 'ether');

  const currentTime = await getLastBlockTime(ctx);

  const marketItem1 = await nftMarketContract.instance.methods.createMarketItem(
    nftContract.receipt.contractAddress,
    nft1TokenId,
    auctionPrice.toString(),
    currentTime + 3600
  ).send({from: owner, value: listingPrice});

  const marketItem2 = await nftMarketContract.instance.methods.createMarketItem(
    nftContract.receipt.contractAddress,
    nft2TokenId,
    auctionPrice.toString(),
    currentTime + 3600
  ).send({value: listingPrice});

  const nftMarketContractTokenCount = await nftContract.instance.methods.balanceOf(nftMarketContract.receipt.contractAddress).call();
  const ownerTokenCount = await nftContract.instance.methods.balanceOf(owner).call();

  /** Created market item transfer ntf to contract */
  ctx.is(nftMarketContractTokenCount, '2');
  ctx.is(ownerTokenCount, '0');
});

spec.test('correctly delete market item', async (ctx) => {
  const nftContract = ctx.get('nftContract');
  const nftMarketContract = ctx.get('nftMarketContract');

  const owner = ctx.get('owner');

  const nft1 = ctx.get('nft1');

  const nft1TokenId = nft1.events.Transfer.returnValues._tokenId;

  const listingPrice = await nftMarketContract.instance.methods.getListingPrice().call();
  const auctionPrice = ethers.utils.parseUnits('1', 'ether');

  const currentTime = await getLastBlockTime(ctx);

  const marketItem1 = await nftMarketContract.instance.methods.createMarketItem(
    nftContract.receipt.contractAddress,
    nft1TokenId,
    auctionPrice.toString(),
    currentTime + 3600
  ).send({from: owner, value: listingPrice});

  const nftMarketContractTokenCount = await nftContract.instance.methods.balanceOf(nftMarketContract.receipt.contractAddress).call();

  /** Created market item transfer ntf to contract */
  ctx.is(nftMarketContractTokenCount, '1');

  const deletedMarketItem = await nftMarketContract.instance.methods.deleteMarketItem(
    marketItem1.events.MarketItemCreated.returnValues.itemId
  ).send({from: owner});

  const updatedNftMarketContractTokenCount = await nftContract.instance.methods.balanceOf(nftMarketContract.receipt.contractAddress).call();
  const updatedOwnerTokenCount = await nftContract.instance.methods.balanceOf(owner).call();

  /** Deleted market item transfer ntf to owner */
  ctx.is(updatedNftMarketContractTokenCount, '0');
  ctx.is(updatedOwnerTokenCount, '2');
});

spec.test('not correctly delete market item', async (ctx) => {
  const nftContract = ctx.get('nftContract');
  const nftMarketContract = ctx.get('nftMarketContract');

  const owner = ctx.get('owner');
  const bob = ctx.get('bob');

  const nft1 = ctx.get('nft1');
  const nft2 = ctx.get('nft2');

  const nft1TokenId = nft1.events.Transfer.returnValues._tokenId;
  const nft2TokenId = nft2.events.Transfer.returnValues._tokenId;

  const listingPrice = await nftMarketContract.instance.methods.getListingPrice().call();
  const auctionPrice = ethers.utils.parseUnits('1', 'ether');

  const currentTime = await getLastBlockTime(ctx);

  const marketItem1 = await nftMarketContract.instance.methods.createMarketItem(
    nftContract.receipt.contractAddress,
    nft1TokenId,
    auctionPrice.toString(),
    currentTime + 3600
  ).send({from: owner, value: listingPrice});

  await ctx.reverts(() => nftMarketContract.instance.methods.deleteMarketItem(
    marketItem1.events.MarketItemCreated.returnValues.itemId
  ).send({from: bob}), '004006');

  const marketItem2 = await nftMarketContract.instance.methods.createMarketItem(
    nftContract.receipt.contractAddress,
    nft2TokenId,
    auctionPrice.toString(),
    currentTime + 3600
  ).send({from: owner, value: listingPrice});

  const marketItemId2 = marketItem2.events.MarketItemCreated.returnValues.itemId;

  const marketItemSale2 = await nftMarketContract.instance.methods.createMarketSale(
    nftContract.receipt.contractAddress,
    marketItemId2
  ).send({from: bob, value: auctionPrice.toString()});

  await ctx.reverts(() => nftMarketContract.instance.methods.deleteMarketItem(
    marketItemId2
  ).send({from: owner}), '004007');
});

spec.test('correctly create market item sell', async (ctx) => {
  const nftContract = ctx.get('nftContract');
  const nftMarketContract = ctx.get('nftMarketContract');

  const owner = ctx.get('owner');
  const bob = ctx.get('bob');

  const nft1 = ctx.get('nft1');

  const nft1TokenId = nft1.events.Transfer.returnValues._tokenId;

  const listingPrice = await nftMarketContract.instance.methods.getListingPrice().call();
  const auctionPrice = ethers.utils.parseUnits('1', 'ether');

  const currentTime = await getLastBlockTime(ctx);

  const marketItem1 = await nftMarketContract.instance.methods.createMarketItem(
    nftContract.receipt.contractAddress,
    nft1TokenId,
    auctionPrice.toString(),
    currentTime + 3600
  ).send({from: owner, value: listingPrice});

  const nftMarketContractTokenCount = await nftContract.instance.methods.balanceOf(nftMarketContract.receipt.contractAddress).call();
  const ownerTokenCount = await nftContract.instance.methods.balanceOf(owner).call();

  /** Created market item transfer ntf to contract */
  ctx.is(nftMarketContractTokenCount, '1');
  ctx.is(ownerTokenCount, '1');

  const marketItemSale1 = await nftMarketContract.instance.methods.createMarketSale(
    nftContract.receipt.contractAddress,
    marketItem1.events.MarketItemCreated.returnValues.itemId
  ).send({from: bob, value: auctionPrice.toString()});

  const updatedNftMarketContractTokenCount = await nftContract.instance.methods.balanceOf(nftMarketContract.receipt.contractAddress).call();
  const updatedOwnerTokenCount = await nftContract.instance.methods.balanceOf(owner).call();
  const updatedBobTokenCount = await nftContract.instance.methods.balanceOf(bob).call();

  ctx.is(updatedNftMarketContractTokenCount, '0');
  ctx.is(updatedOwnerTokenCount, '1');

  /** Market item sell transfer ntf from contract to bob */
  ctx.is(updatedBobTokenCount, '1');

  const bobTokens = await nftMarketContract.instance.methods.fetchMyNFTs().call({from: bob});
  ctx.is(bobTokens.length, 1);
});


spec.test('not correctly create market item sell with short deadline', async (ctx) => {
  const nftContract = ctx.get('nftContract');
  const nftMarketContract = ctx.get('nftMarketContract');

  const owner = ctx.get('owner');
  const bob = ctx.get('bob');

  const nft1 = ctx.get('nft1');

  const nft1TokenId = nft1.events.Transfer.returnValues._tokenId;

  const listingPrice = await nftMarketContract.instance.methods.getListingPrice().call();
  const auctionPrice = ethers.utils.parseUnits('1', 'ether');

  const currentTime = await getLastBlockTime(ctx);

  const marketItem1 = await nftMarketContract.instance.methods.createMarketItem(
    nftContract.receipt.contractAddress,
    nft1TokenId,
    auctionPrice.toString(),
    currentTime + 2
  ).send({from: owner, value: listingPrice});

  await new Promise(f => setTimeout(f, 2500));

  await ctx.reverts(() => nftMarketContract.instance.methods.createMarketSale(
    nftContract.receipt.contractAddress,
    nft1TokenId
  ).send({from: bob, value: auctionPrice.toString()}), '004005');
});

async function getLastBlockTime(ctx: Context): Promise<number> {
  const lastBlockNumber = await ctx.web3.eth.getBlockNumber();
  const blockData = await ctx.web3.eth.getBlock(lastBlockNumber);

  return blockData.timestamp;
}