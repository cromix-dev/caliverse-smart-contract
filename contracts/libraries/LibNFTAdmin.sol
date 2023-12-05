// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

library LibNFTAdmin {
  function isAdmin(address[] storage admins) public view {
    bool _isAdmin = false;
    for (uint256 i = 0; i < admins.length; i++) {
      if (admins[i] == tx.origin) {
        _isAdmin = true;
      }
    }

    require(_isAdmin, 'The caller is not admin');
  }

  function removeAdmin(address[] storage admins, address address_) public {
    bool _hasAdmin = false;
    for (uint256 i = 0; i < admins.length - 1; i++) {
      if (admins[i] == address_) {
        admins[i] = admins[admins.length - 1];
        _hasAdmin = true;
      }
    }

    if (_hasAdmin) {
      admins.pop();
    }
  }
}
