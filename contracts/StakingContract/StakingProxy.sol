// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol';

contract StakingProxy is TransparentUpgradeableProxy {
  constructor(address _logic, address admin_) TransparentUpgradeableProxy(_logic, admin_, '') {}
}
