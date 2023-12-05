// WALLET_PK= npx truffle migrate -f 1 --to 1 --network goerli --reset
// WALLET_PK= npx truffle migrate -f 1 --to 1 --network mainnet --reset
const { setConfig } = require("./config.js");
const EthDistributer = artifacts.require("../contracts/EthDistributer.sol");

module.exports = async (deployer, network) => {
  await deployer.deploy(EthDistributer);
  setConfig("deployed." + network + ".EthDistributer", EthDistributer.address);
};
