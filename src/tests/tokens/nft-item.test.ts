import {Spec} from '@specron/spec';

/**
 * Spec context interfaces.
 */

interface Data {
  nfToken?: any;
  owner?: string;
  bob?: string;
  zeroAddress?: string;
  contractAddress?: string;
  uri1?: string;
  uri2?: string;
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
  ctx.set('contractAddress', '0x1000000000000000000000000000000000000000');
});

spec.beforeEach(async (ctx) => {
  ctx.set('uri1', 'http://0xcert.org/1');
  ctx.set('uri2', 'http://0xcert.org/2');
});

spec.beforeEach(async (ctx) => {
  const nfToken = await ctx.deploy({
    src: './build/tests/nft-item.json',
    contract: 'NftItem',
    args: ['Art token item', 'ATI', ctx.get('contractAddress')]
  });
  ctx.set('nfToken', nfToken);
});

spec.test('correctly create a NFT', async (ctx) => {
  const nftoken = ctx.get('nfToken');
  const owner = ctx.get('owner');
  const uri1 = ctx.get('uri1');

  await nftoken.instance.methods.createToken(uri1).send({from: owner});
  const count = await nftoken.instance.methods.balanceOf(owner).call();
  ctx.is(count.toString(), '1');
});

spec.test('not correctly create a NFT by init call not contract owner', async (ctx) => {
  const nftoken = ctx.get('nfToken');
  const bob = ctx.get('bob');
  const uri1 = ctx.get('uri1');

  await ctx.reverts(() => nftoken.instance.methods.createToken(uri1).send({from: bob}), '018001');
});
