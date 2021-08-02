const NtfItem = artifacts.require('NftItem');

module.exports = async function (deployer) {
  await deployer.deploy(NtfItem, 'Art token item', 'ATI');
  const erc721 = await NtfItem.deployed();
};