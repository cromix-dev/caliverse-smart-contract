const GeneralERC721Factory = artifacts.require('../contracts/GeneralERC721/GeneralERC721Factory.sol');

contract('GeneralERC721Factory', (accounts) => {
  it('build erc721', async () => {
    const factory = await GeneralERC721Factory.deployed();
    const result = await factory.build('name', 'symbol', 100);
    console.log(result);
  });
});
