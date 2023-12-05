// WALLET_PK=$CALIVERSE_SEPOLIA_TEST_WALLET_PK npx truffle migrate -f 1 --to 1 --network sepolia --reset
// WALLET_PK=$CALIVERSE_QA_WALLET_PK npx truffle migrate -f 1 --to 1 --network mainnet --reset
const { setConfig } = require('./config.js');
const GeneralERC721V1 = artifacts.require('../contracts/GeneralERC721/GeneralERC721V1.sol');
const GeneralERC721Factory = artifacts.require('../contracts/GeneralERC721/GeneralERC721Factory.sol');
const LibNFTAdmin = artifacts.require('../contracts/libraries/LibNFTAdmin.sol');
const LibSale = artifacts.require('../contracts/libraries/LibSale.sol');
const StakingContractV1 = artifacts.require('../contracts/StakingContract/StakingContractV1.sol');
const StakingProxyAdmin = artifacts.require('../contracts/StakingContract/StakingProxyAdmin.sol');
const StakingProxy = artifacts.require('../contracts/StakingContract/StakingProxy.sol');

const TransparentUpgradeableProxy = artifacts.require(
  '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol',
);

const baseUri = 'https://dev-cdn.caliverse.io/contracts/';

module.exports = async (deployer, network, accounts) => {
  // console.log('deploy address: ', accounts[0]);
  await deployer.deploy(LibNFTAdmin);
  setConfig('deployed.' + network + '.LibNFTAdmin', LibNFTAdmin.address);
  await deployer.deploy(LibSale);
  setConfig('deployed.' + network + '.LibSale', LibSale.address);
  await deployer.link(LibNFTAdmin, GeneralERC721V1);
  await deployer.link(LibSale, GeneralERC721V1);

  const libnftAdmin = await LibNFTAdmin.at('0xBdEA81ac0A9658416fa669A0A8e439fAb9A519Cc');
  const libsale = await LibSale.at('0x35D22D1C9F341105f1813E1E8725f6AD6DE6E815');
  await deployer.link(libnftAdmin, GeneralERC721V1);
  await deployer.link(libsale, GeneralERC721V1);

  await deployer.deploy(GeneralERC721V1);
  setConfig('deployed.' + network + '.GeneralERC721V1', GeneralERC721V1.address);
  await deployer.deploy(GeneralERC721Factory, GeneralERC721V1.address, baseUri, accounts[0]);
  setConfig('deployed.' + network + '.GeneralERC721Factory', GeneralERC721Factory.address);

  // 스테이킹 컨트렉트 배포
  await deployer.deploy(StakingProxyAdmin);
  setConfig('deployed.' + network + '.StakingProxyAdmin', StakingProxyAdmin.address);
  await deployer.deploy(StakingContractV1);
  setConfig('deployed.' + network + '.StakingContractV1', StakingContractV1.address);
  await deployer.deploy(StakingProxy, StakingContractV1.address, StakingProxyAdmin.address);
  setConfig('deployed.' + network + '.StakingProxy', StakingProxy.address);
  const stakingProxy = await StakingContractV1.at(StakingProxy.address);
  await stakingProxy.initialize();
};
