// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";

contract WrapperExchangeRegistry is AdminAuth {
	mapping(address => bool) private wrappers;

	error EmptyAddrError();

	function addWrapper(address _wrapper) public onlyOwner {
		if(_wrapper == address(0)) {
			revert EmptyAddrError();
		}

		wrappers[_wrapper] = true;
	}

	function removeWrapper(address _wrapper) public onlyOwner {
		wrappers[_wrapper] = false;
	}

	function isWrapper(address _wrapper) public view returns(bool) {
		return wrappers[_wrapper];
	}
}
