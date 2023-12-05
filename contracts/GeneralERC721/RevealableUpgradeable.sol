// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract RevealableUpgradeable is Initializable, OwnableUpgradeable {
  bool public revealed;
  string internal _revealURI;

  function initialize() external initializer {
    revealed = false;
    _revealURI = "";
  }

  function reveal(string memory uri) public onlyOwner {
    revealed = true;
    setRevealURI(uri);
  }

  function hide() public onlyOwner {
    revealed = false;
  }

  function setRevealURI(string memory uri) public onlyOwner {
    _revealURI = uri;
  }
}
