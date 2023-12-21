const path = require('path');
const _ = require('lodash');
const { Web3 } = require('web3');
const web3 = new Web3('http://localhost:8545');
const GeneralERC721V1 = artifacts.require('../contracts/GeneralERC721/GeneralERC721V1.sol');
const GeneralERC721Factory = artifacts.require('../contracts/GeneralERC721/GeneralERC721Factory.sol');
const StakingContract = artifacts.require('../contracts/StakingContract/StakingContract.sol');
const Bignumber = require('bignumber.js');
const { SignTypedDataVersion, signTypedData, TypedDataUtils } = require('@metamask/eth-sig-util');
const { createObjectCsvWriter } = require('csv-writer');
const { mergeMap, interval, takeUntil, Subject, lastValueFrom } = require('rxjs');

const makeData = (mintType, eoaAddress, stakingAddress, nonces, quantity, contractAddress, chainId) => {
  const data = {
    types: {
      // Define the types of your data structure
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      MintData: [
        { name: 'mintType', type: 'uint32' },
        { name: 'externalWallet', type: 'address' },
        { name: 'stakingContract', type: 'address' },
        { name: 'nonces', type: 'uint256[]' },
        { name: 'quantity', type: 'uint256' },
      ],
    },
    primaryType: 'MintData',
    domain: {
      chainId,
      name: 'name',
      version: 'V1',
      verifyingContract: contractAddress,
    },
    message: {
      mintType,
      externalWallet: eoaAddress,
      stakingContract: stakingAddress,
      nonces,
      quantity,
    },
  };

  return data;
};

const Account0PK = '65304613e5b307934dfe50ac9f646106030820cdcc2df8d42e4c4c74b44262df';

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
      Account0PK,
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

  it.only('test allow mint 10000 with 10 account', async () => {
    const csvWriter = createObjectCsvWriter({
      path: path.resolve(__dirname, './result.csv'),
      header: ['account', 'quantity', 'gasUsed'],
    });
    const nonces = _.range(0, 10000);

    const maxNFT = 200;
    const factory = await GeneralERC721Factory.deployed();
    const result = await factory.build('name', 'symbol', maxNFT);
    const erc721addr = result.receipt.rawLogs[0].address;
    const erc721 = await GeneralERC721V1.at(erc721addr);

    const startTime = Math.floor(Date.now() / 1000) - 10000;
    const endTime = Math.floor(Date.now() / 1000) + 10000;
    const owner = await erc721.owner();
    const saleLimit = maxNFT;
    const price = 0.0001 * 1e18;
    const mintType = 2;
    const maxPerAddress = maxNFT;
    const maxPerTx = maxNFT;
    await erc721.setSaleInfo(startTime, endTime, price, saleLimit, mintType, maxPerAddress, maxPerTx);

    console.log({ owner, erc721addr });

    const staking = await StakingContract.deployed();
    const stakingContract = staking.address;
    const chainIdBN = await erc721.getChainId();
    const chainId = chainIdBN.toNumber();

    const mint = async (id, account, quantity) => {
      console.log('mint: ', { id, account, quantity });
      const externalWalletAddress = account;
      const _nonces = nonces.slice(0, quantity);
      nonces.shift(quantity);
      const data = makeData(mintType, externalWalletAddress, stakingContract, _nonces, quantity, erc721addr, chainId);
      const sig = signTypedData({
        data,
        version: SignTypedDataVersion.V4,
        privateKey: Buffer.from(Account0PK, 'hex'),
      });

      const tx = await erc721.allowMint(externalWalletAddress, stakingContract, _nonces, quantity, sig, {
        value: price * quantity,
        from: account,
      });

      console.log(`TX ${id} mined: `, tx.receipt.gasUsed);
      await csvWriter.writeRecords([{ account, quantity, gasUsed: tx.receipt.gasUsed }]);
    };

    let totalMinted = 0;

    const stopSig$ = new Subject();

    await lastValueFrom(
      interval(300).pipe(
        takeUntil(stopSig$),
        mergeMap(async (i) => {
          if (totalMinted === maxNFT) {
            stopSig$.next();
            return;
          }
          console.log('index: ', i);
          const accountIndex = Math.floor(Math.random() * 10);
          const quantity = 1;
          const account = accounts[accountIndex];
          console.log({ account, quantity, accountIndex });
          await mint(i, account, quantity);
          totalMinted += quantity;
          console.log('totalMinted: ', totalMinted);

          if (totalMinted === maxNFT) {
            stopSig$.next();
            return;
          }
        }),
      ),
    );

    // for (let i = 0; i < 10; i++) {
    //   await mint(i, accounts[i], 10);
    // }

    // const gasUsed = await web3.eth.estimateGas({ from: accounts[1], to: tx.receipt.to, data: tx.receipt.input });

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
