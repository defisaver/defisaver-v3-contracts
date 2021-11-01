// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../interfaces/compound/IComptroller.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/compound/ICToken.sol";
import "../utils/Exponential.sol";

contract CompRewardView is Exponential {
    IComptroller public constant comp = IComptroller(
        0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B
    );
    address public constant COMP_ADDR = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    uint224 public constant compInitialIndex = 1e36;

    function _claim(
        address _user,
        address[] memory _cTokensSupply,
        address[] memory _cTokensBorrow
    ) internal {
        address[] memory u = new address[](1);
        u[0] = _user;

        comp.claimComp(u, _cTokensSupply, false, true);
        comp.claimComp(u, _cTokensBorrow, true, false);
    }

    function getBalance(address _user, address[] memory _cTokens) public  returns (uint256) {
        _claim(_user, _cTokens, _cTokens);

        return IERC20(COMP_ADDR).balanceOf(_user);
    }
}