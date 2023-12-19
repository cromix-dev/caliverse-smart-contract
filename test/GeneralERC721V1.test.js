const { Web3 } = require('web3');
const web3 = new Web3('http://localhost:8545');
const GeneralERC721V1 = artifacts.require('../contracts/GeneralERC721/GeneralERC721V1.sol');
const GeneralERC721Factory = artifacts.require('../contracts/GeneralERC721/GeneralERC721Factory.sol');
const StakingContract = artifacts.require('../contracts/StakingContract/StakingContract.sol');
const Bignumber = require('bignumber.js');

const makeData = (eoaAddress, erc721addr, stakingAddress, chainId, nonce) => {
  const eoabyte32 = eoaAddress.slice(2).padStart(64, 0);
  const stakingAddrbyte32 = stakingAddress.slice(2).padStart(64, 0);
  const chainIdbyte32 = web3.utils.numberToHex(chainId).slice(2).padStart(64, 0);
  const noncebyte32 = web3.utils.numberToHex(nonce).slice(2).padStart(64, 0);
  const data = `0x` + eoabyte32 + stakingAddrbyte32 + chainIdbyte32 + noncebyte32 + erc721addr.slice(2).padStart(64, 0);

  return data;
};

contract('GeneralERC721V1', (accounts) => {
  it('get chain id', async () => {
    const factory = await GeneralERC721Factory.deployed();
    const result = await factory.build('name', 'symbol', 100);
    const erc721addr = result.receipt.rawLogs[0].address;
    const erc721 = await GeneralERC721V1.at(erc721addr);

    const chainId = await erc721.getChainId();
    console.log(chainId.toNumber());
  });
  it('test public mint from newly deployed contract', async () => {
    const factory = await GeneralERC721Factory.deployed();
    const result = await factory.build('name', 'symbol', 100);
    const erc721addr = result.receipt.rawLogs[0].address;
    const erc721 = await GeneralERC721V1.at(erc721addr);
    const startTime = Math.floor(Date.now() / 1000) - 10000;
    const endTime = Math.floor(Date.now() / 1000) + 10000;
    const owner = await erc721.owner();
    const publicMintType = 1;

    const price = new Bignumber(0.01e18);
    await erc721.setSaleInfo(startTime, endTime, price.toString(), 100, publicMintType, 10, 10);

    console.log({ owner });
    const caliverseHotwallet = await erc721.caliverseHotwallet();
    console.log({ caliverseHotwallet });

    const staking = await StakingContract.deployed();

    const quantity = 10;
    const eoabyte32 = accounts[1].slice(2).padStart(64, 0);
    const stakingAddrbyte32 = staking.address.slice(2).padStart(64, 0);
    const chainIdBN = await erc721.getChainId();
    console.log(chainIdBN.toNumber());
    const chainIdbyte32 = web3.utils.numberToHex(chainIdBN.toNumber()).slice(2).padStart(64, 0);
    const nonce = 1;
    const noncebyte32 = web3.utils.numberToHex(nonce).slice(2).padStart(64, 0);
    const data =
      `0x` + eoabyte32 + stakingAddrbyte32 + chainIdbyte32 + noncebyte32 + erc721addr.slice(2).padStart(64, 0);
    console.log('민팅 데이터: ', { data });

    const tmpresult = await erc721.splitData(data);
    console.log(
      { tmpresult, erc721addr },
      tmpresult[2].toNumber(),
      tmpresult[3].toNumber(),
      tmpresult[4].toNumber(),
      tmpresult[5],
    );

    const sig = web3.eth.accounts.sign(
      data,
      // truffle 에서 0번 계정의 private key 를 가져옴
      //0x06a993a51c1f7943d2829bF6A23d92dd8cF7F190
      '0x554ed756dbb3e7ed0cfe4b68bc7b31a87a0b483d287550ef3980e065f7e131d1',
    ).signature;
    const pubmintResult = await erc721.publicMint(data, sig, {
      from: accounts[1],
      value: price.multipliedBy(quantity).toString(),
    });

    console.log(pubmintResult);
    console.log(pubmintResult.logs.slice(-1)[0]);
    console.log(pubmintResult.receipt.rawLogs.slice(-1)[0]);

    const tokenId = 0;
    console.log('is token staked: ', (await staking.stakingInfo(erc721addr, accounts[1], tokenId)).toNumber());
    await staking.unstake(erc721addr, tokenId, { from: accounts[1] });
    await erc721.setApprovalForAll(staking.address, 1, { from: accounts[1] });
    await staking.stake(erc721addr, tokenId, { from: accounts[1] });
    console.log({ erc721addr, 'staking contract address': staking.address });
  });
  it('test public mint from already deployed contract', async () => {
    console.log('test public mint from already deployed contract');
    const erc721addr = '0x4169f01Ee9c73568C4569b62FC76C70Ce9124928';
    const stakingAddr = '0xfA521010be807d0b08616DC227c012bb038a7005';
    // const erc721 = await GeneralERC721V1.at(erc721addr);
    // const startTime = Math.floor(Date.now() / 1000) - 10000;
    // const endTime = Math.floor(Date.now() / 1000) + 10000;
    // const owner = await erc721.owner();
    // const publicMintType = 1;

    // const walletPair = `0x${accounts[1].slice(2)}${stakingProxy.address.slice(2)}`;
    // const sig = web3.eth.accounts.sign(
    //   walletPair,
    //   '0x770be1959183678b32e7ddc233cc888bbb1cc85b8bf74eccac38fe256611a8d8',
    // ).signature;
    // await erc721.publicMint(walletPair, 1, sig, 1, { from: accounts[1] });

    const tokenId = 1;
    await stakingProxy.unstake(erc721addr, tokenId, { from: accounts[1] });
  });

  it.only('allowlist mint', async () => {
    const factory = await GeneralERC721Factory.deployed();
    const result = await factory.build('name', 'symbol', 100);
    const erc721addr = result.receipt.rawLogs[0].address;
    const erc721 = await GeneralERC721V1.at(erc721addr);
    const startTime = Math.floor(Date.now() / 1000) - 10000;
    const endTime = Math.floor(Date.now() / 1000) + 10000;
    const owner = await erc721.owner();
    const allowmintType = 2;
    const maxPerAddress = 30;
    const maxPerTx = 10;
    await erc721.setSaleInfo(startTime, endTime, 0, 100, allowmintType, maxPerAddress, maxPerTx);

    console.log({ owner, erc721addr });
    await erc721.seedAllowlist([accounts[1]], [10]);
    const staking = await StakingContract.deployed();
    const chainIdBN = await erc721.getChainId();
    console.log(chainIdBN.toNumber());
    const data = makeData(accounts[1], erc721addr, staking.address, chainIdBN.toNumber(), 1);
    console.log(data);
    const sig = web3.eth.accounts.sign(
      data,
      '0xd677ee5cbe63ef0e082d43cc2e9eb1bd4228ddca6dcca9586529ba9e87bf82a7',
    ).signature;

    const tx = await erc721.allowMint(data, 1, sig, { from: accounts[1] });
    // const gasUsed = await web3.eth.estimateGas({ from: accounts[1], to: tx.receipt.to, data: tx.receipt.input });
    console.log('gas used: ', tx.receipt.gasUsed); //342052 이상적: 167,264
    // let allowamount = (await erc721.allowlist(accounts[1])).toNumber();
    // console.log({ allowamount });
    // await erc721.seedAllowlist([accounts[1]], [0]);
    // allowamount = (await erc721.allowlist(accounts[1])).toNumber();
    // console.log({ allowamount, 'accounts[1]': accounts[1] });

    // try {
    //   await erc721.allowMint.call(data, 10, sig, { from: accounts[1] });
    // } catch (err) {
    //   console.log({ err });
    //   assert.equal(err.message, 'VM Exception while processing transaction: revert not eligible for allowlist mint');
    // }
  });
});
