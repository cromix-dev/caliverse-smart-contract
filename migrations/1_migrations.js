// QA 배포: WALLET_PK=$CALIVERSE_QA_WALLET_PK APP_ENV=qa npx truffle migrate -f 1 --to 1 --network mainnet --reset
// DEV 배포: WALLET_PK=$CALIVERSE_SEPOLIA_TEST_WALLET_PK APP_ENV=dev npx truffle migrate -f 1 --to 1 --network sepolia --reset
const { setConfig } = require('./config.js');
const GeneralERC721V1 = artifacts.require('../contracts/GeneralERC721/GeneralERC721V1.sol');
const GeneralERC721Factory = artifacts.require('../contracts/GeneralERC721/GeneralERC721Factory.sol');
const LibNFTAdmin = artifacts.require('../contracts/libraries/LibNFTAdmin.sol');
const LibSale = artifacts.require('../contracts/libraries/LibSale.sol');
const StakingContract = artifacts.require('../contracts/StakingContract/StakingContract.sol');

module.exports = async (deployer, network, accounts) => {
  const baseUri =
    network == 'mainnet' && process.env.APP_ENV == 'prod'
      ? 'https://cdn.caliverse.io/contracts/'
      : network == 'mainnet' && process.env.APP_ENV == 'qa'
      ? 'https://qa-cdn.caliverse.io/contracts/'
      : 'https://dev-cdn.caliverse.io/contracts/';

  console.log({ baseUri, accounts });
  console.log('deploy address: ', accounts[0]);

  await deployer.deploy(LibNFTAdmin);
  setConfig('deployed.' + network + '.LibNFTAdmin', LibNFTAdmin.address);
  await deployer.deploy(LibSale);
  setConfig('deployed.' + network + '.LibSale', LibSale.address);
  await deployer.link(LibNFTAdmin, GeneralERC721V1);
  await deployer.link(LibSale, GeneralERC721V1);

  // START 이미 배포된 라이브러리 사용하고 싶은 경우
  // const libnftAdmin = await LibNFTAdmin.at('0xBdEA81ac0A9658416fa669A0A8e439fAb9A519Cc');
  // const libsale = await LibSale.at('0x35D22D1C9F341105f1813E1E8725f6AD6DE6E815');
  // await deployer.link(libnftAdmin, GeneralERC721V1);
  // await deployer.link(libsale, GeneralERC721V1);
  // END 이미 배포된 라이브러리 사용하고 싶은 경우

  await deployer.deploy(GeneralERC721V1);
  setConfig('deployed.' + network + '.GeneralERC721V1', GeneralERC721V1.address);
  await deployer.deploy(GeneralERC721Factory, GeneralERC721V1.address, baseUri, accounts[0]);
  setConfig('deployed.' + network + '.GeneralERC721Factory', GeneralERC721Factory.address);

  // 스테이킹 컨트렉트 배포
  await deployer.deploy(StakingContract);
  setConfig('deployed.' + network + '.StakingContract', StakingContract.address);
};
