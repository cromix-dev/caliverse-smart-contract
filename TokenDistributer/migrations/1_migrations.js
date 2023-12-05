// WALLET_PK= npx truffle migrate -f 1 --to 1 --network goerli --reset
// WALLET_PK= npx truffle migrate -f 1 --to 1 --network mainnet --reset
const { setConfig } = require("./config.js");
const TokenDistributer = artifacts.require("../contracts/TokenDistributer.sol");

module.exports = async (deployer, network) => {
  await deployer.deploy(TokenDistributer);
  setConfig("deployed." + network + ".TokenDistributer", TokenDistributer.address);
};
