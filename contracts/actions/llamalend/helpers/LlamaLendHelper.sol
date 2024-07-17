// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MainnetLlamaLendAddresses } from "./MainnetLlamaLendAddresses.sol";
import { ILlamaLendController } from "../../../interfaces/llamalend/ILlamaLendController.sol";
import { ILlamaLendFactory } from "../../../interfaces/llamalend/ILlamaLendFactory.sol";
import { ILLAMMA } from "../../../interfaces/llamalend/ILLAMA.sol";
import { IAGG } from "../../../interfaces/llamalend/IAGG.sol";
import { IERC20 } from "../../../interfaces/IERC20.sol";
import { DSMath } from "../../../DS/DSMath.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { IBytesTransientStorage } from "../../../interfaces/IBytesTransientStorage.sol";

contract LlamaLendHelper is MainnetLlamaLendAddresses, DSMath {
    using TokenUtils for address;

    error InvalidLlamaLendController();

    IBytesTransientStorage constant transientStorage = IBytesTransientStorage(BYTES_TRANSIENT_STORAGE);
    ILlamaLendFactory constant factory = ILlamaLendFactory(LLAMALEND_FACTORY);

    bytes4 constant LLAMALEND_SWAPPER_ID = bytes4(keccak256("LlamaLendSwapper"));

    function isControllerValid(address _controllerAddr, uint256 _controllerId) public view returns (bool) {
        return (factory.controllers(_controllerId) == _controllerAddr);
    }

    function getCollateralRatio(address _user, address _controllerAddr) public view returns (uint256 collRatio, bool isInSoftLiquidation) {
        // fetch users debt
        uint256 debt = ILlamaLendController(_controllerAddr).debt(_user);
        // no position can exist without debt
        if (debt == 0) return (0, false);
        (uint256 debtAssetCollAmount, uint256 collAmount) = getCollAmountsFromAMM(_controllerAddr, _user);
        // if user has debt asset as coll he is currently underwater
        if (debtAssetCollAmount > 0) isInSoftLiquidation = true;

        // fetch collToken oracle price
        address amm = ILlamaLendController(_controllerAddr).amm();
        uint256 oraclePrice = ILLAMMA(amm).price_oracle();
        // calculate collAmount as WAD (18 decimals)
        address collToken = ILlamaLendController(_controllerAddr).collateral_token();
        uint256 assetDec = IERC20(collToken).decimals();
        uint256 collAmountWAD = assetDec > 18 ? (collAmount / 10 ** (assetDec - 18)) : (collAmount * 10 ** (18 - assetDec));
        
        collRatio = wdiv(wmul(collAmountWAD, oraclePrice) + debtAssetCollAmount, debt);
    }

    function _sendLeftoverFunds(
        address _collToken,
        address _debtToken,
        uint256 _collStartingBalance,
        uint256 _debtStartingBalance,
        address _to
    ) internal returns (uint256 collTokenReceived, uint256 debtTokenReceived) {
        collTokenReceived = _collToken.getBalance(address(this)) - _collStartingBalance;
        debtTokenReceived = _debtToken.getBalance(address(this)) - _debtStartingBalance;
        _collToken.withdrawTokens(_to, collTokenReceived);
        _debtToken.withdrawTokens(_to, debtTokenReceived);
    }

    function userMaxWithdraw(
        address _controllerAddress,
        address _user
    ) public view returns (uint256 maxWithdraw) {
        uint256[4] memory userState = ILlamaLendController(_controllerAddress).user_state(_user);
        return
            userState[0] -
            ILlamaLendController(_controllerAddress).min_collateral(userState[2], userState[3]);
    }

    function getCollAmountsFromAMM(
        address _controllerAddress,
        address _user
    ) public view returns (uint256 debtAssetCollAmount, uint256 collAssetCollAmount) {
        address llammaAddress = ILlamaLendController(_controllerAddress).amm();
        uint256[2] memory xy = ILLAMMA(llammaAddress).get_sum_xy(_user);
        debtAssetCollAmount = xy[0];
        collAssetCollAmount = xy[1];
    }
}