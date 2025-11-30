// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { IHub } from "../../../contracts/interfaces/protocols/aaveV4/IHub.sol";
import { ExecuteActionsBase } from "../../utils/executeActions/ExecuteActionsBase.sol";
import { AaveV4Helper } from "../../../contracts/actions/aaveV4/helpers/AaveV4Helper.sol";
import { AaveV4Supply } from "../../../contracts/actions/aaveV4/AaveV4Supply.sol";
import { AaveV4Borrow } from "../../../contracts/actions/aaveV4/AaveV4Borrow.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { console2 } from "forge-std/console2.sol";

contract AaveV4TestBase is ExecuteActionsBase, AaveV4Helper {
    uint256 internal constant RAY = 1e27;

    address internal constant CORE_SPOKE = 0xBa97c5E52cd5BC3D7950Ae70779F8FfE92d40CdC;
    uint256 internal constant CORE_RESERVE_ID_WETH = 0;
    uint256 internal constant CORE_RESERVE_ID_WSTETH = 1;
    uint256 internal constant CORE_RESERVE_ID_WBTC = 2;
    uint256 internal constant CORE_RESERVE_ID_CBBTC = 3;
    uint256 internal constant CORE_RESERVE_ID_USDT = 4;
    uint256 internal constant CORE_RESERVE_ID_USDC = 5;

    struct AaveV4TestPair {
        address spoke;
        uint256 collReserveId;
        uint256 debtReserveId;
    }

    function getTestPairs() internal pure returns (AaveV4TestPair[] memory retVal) {
        retVal = new AaveV4TestPair[](1);
        retVal[0] = AaveV4TestPair({
            spoke: CORE_SPOKE,
            collReserveId: CORE_RESERVE_ID_USDC,
            debtReserveId: CORE_RESERVE_ID_WETH
        });
    }

    function _executeAaveV4Supply(
        AaveV4TestPair memory _testPair,
        uint256 _supplyAmountInUSD,
        address _sender,
        SmartWallet _wallet
    ) internal returns (bool success) {
        ISpoke.Reserve memory reserve = ISpoke(_testPair.spoke).getReserve(_testPair.collReserveId);
        address underlying = reserve.underlying;
        address walletAddr = _wallet.walletAddr();
        uint256 supplyAmount = amountInUSDPrice(underlying, _supplyAmountInUSD);

        if (!_isValidSupply(_testPair.spoke, supplyAmount, reserve)) return false;

        give(underlying, _sender, supplyAmount);
        approveAsSender(_sender, underlying, walletAddr, supplyAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4SupplyEncode(
                _testPair.spoke, walletAddr, _sender, _testPair.collReserveId, supplyAmount, true
            ),
            true
        );

        _wallet.execute(address(new AaveV4Supply()), executeActionCallData, 0);

        success = true;
    }

    function _executeAaveV4Borrow(
        address _spoke,
        uint256 _reserveId,
        uint256 _borrowAmount,
        address _to,
        SmartWallet _wallet
    ) internal returns (bool success) {
        ISpoke.Reserve memory reserve = ISpoke(_spoke).getReserve(_reserveId);
        address walletAddr = _wallet.walletAddr();

        if (!_isValidBorrow(_spoke, _borrowAmount, reserve)) {
            console2.log("Invalid borrow. Check caps and reserve/spoke status.");
            return false;
        }

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4BorrowEncode(_spoke, walletAddr, _to, _reserveId, _borrowAmount), true
        );

        _wallet.execute(address(new AaveV4Borrow()), executeActionCallData, 0);
        success = true;
    }

    function _isValidSupply(address _spoke, uint256 _amount, ISpoke.Reserve memory _reserve)
        internal
        view
        returns (bool)
    {
        if (_reserve.paused || _reserve.frozen) {
            console2.log("Reserve is paused or frozen, skipping test");
            return false;
        }

        IHub.SpokeData memory spokeData = IHub(_reserve.hub).getSpoke(_reserve.assetId, _spoke);
        if (!spokeData.active || spokeData.paused) {
            console2.log("Spoke is paused or inactive, skipping test");
            return false;
        }

        uint256 spokeAddedAssets = IHub(_reserve.hub).getSpokeAddedAssets(_reserve.assetId, _spoke);
        uint256 addCap = spokeData.addCap * (10 ** _reserve.decimals);
        if (
            spokeData.addCap != IHub(_reserve.hub).MAX_ALLOWED_SPOKE_CAP()
                && spokeAddedAssets + _amount > addCap
        ) {
            console2.log("Spoke added assets exceeds asset cap, skipping test");
            return false;
        }

        return true;
    }

    function _isValidBorrow(address _spoke, uint256 _amount, ISpoke.Reserve memory _reserve)
        internal
        view
        returns (bool)
    {
        if (_reserve.paused || _reserve.frozen || !_reserve.borrowable) {
            console2.log("Reserve is paused or frozen or not borrowable, skipping test");
            return false;
        }

        IHub.SpokeData memory spokeData = IHub(_reserve.hub).getSpoke(_reserve.assetId, _spoke);
        if (!spokeData.active || spokeData.paused) {
            console2.log("Spoke is paused or inactive, skipping test");
            return false;
        }

        uint256 spokeTotalOwed = IHub(_reserve.hub).getSpokeTotalOwed(_reserve.assetId, _spoke);
        uint256 drawCap = spokeData.drawCap * (10 ** _reserve.decimals);
        if (
            spokeData.drawCap != IHub(_reserve.hub).MAX_ALLOWED_SPOKE_CAP()
                && spokeTotalOwed + _amount + spokeData.deficitRay / RAY > drawCap
        ) {
            console2.log("Spoke total owed exceeds draw cap, skipping test");
            return false;
        }

        return true;
    }
}
