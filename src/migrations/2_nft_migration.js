const NtfItem = artifacts.require('NftItem');
const NftMarket = artifacts.require('NftMarket');

module.exports = async function (deployer) {
  await deployer.deploy(NftMarket);
  const nftMarket = await NftMarket.deployed();

  await deployer.deploy(NtfItem, 'Art token item', 'ATI', nftMarket.address);
  const erc721 = await NtfItem.deployed();
};