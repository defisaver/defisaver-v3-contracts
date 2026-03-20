// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { IHub } from "../../../contracts/interfaces/protocols/aaveV4/IHub.sol";
import { IAaveV4Oracle } from "../../../contracts/interfaces/protocols/aaveV4/IAaveV4Oracle.sol";
import {
    IConfigPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import {
    ITakerPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { ExecuteActionsBase } from "../../utils/executeActions/ExecuteActionsBase.sol";
import { AaveV4Helper } from "../../../contracts/actions/aaveV4/helpers/AaveV4Helper.sol";
import { AaveV4RatioHelper } from "../../../contracts/actions/aavev4/helpers/AaveV4RatioHelper.sol";
import { AaveV4Supply } from "../../../contracts/actions/aaveV4/AaveV4Supply.sol";
import { AaveV4Borrow } from "../../../contracts/actions/aaveV4/AaveV4Borrow.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { console2 } from "forge-std/console2.sol";

contract AaveV4TestBase is ExecuteActionsBase, AaveV4Helper, AaveV4RatioHelper {
    uint256 internal constant RAY = 1e27;

    address internal constant CORE_HUB = 0x630c2cFF89cb11E62dE047EaeD8C4B396906bD7D;
    address internal constant CORE_SPOKE = 0x6488A415e9eA693EC7Ef32579507e1907c0AC798;
    uint256 internal constant CORE_RESERVE_ID_WETH = 0;
    uint256 internal constant CORE_RESERVE_ID_WSTETH = 1;
    uint256 internal constant CORE_RESERVE_ID_WBTC = 3;
    uint256 internal constant CORE_RESERVE_ID_USDC = 7;
    uint256 internal constant CORE_RESERVE_ID_USDT = 8;

    struct AaveV4TestPair {
        address spoke;
        uint256 collReserveId;
        uint256 debtReserveId;
    }

    function getTestPairs() internal pure returns (AaveV4TestPair[] memory retVal) {
        retVal = new AaveV4TestPair[](4);
        retVal[0] = AaveV4TestPair({
            spoke: CORE_SPOKE,
            collReserveId: CORE_RESERVE_ID_WETH,
            debtReserveId: CORE_RESERVE_ID_USDC
        });
        retVal[1] = AaveV4TestPair({
            spoke: CORE_SPOKE,
            collReserveId: CORE_RESERVE_ID_WSTETH,
            debtReserveId: CORE_RESERVE_ID_WETH
        });
        retVal[2] = AaveV4TestPair({
            spoke: CORE_SPOKE,
            collReserveId: CORE_RESERVE_ID_USDC,
            debtReserveId: CORE_RESERVE_ID_WETH
        });
        retVal[3] = AaveV4TestPair({
            spoke: CORE_SPOKE,
            collReserveId: CORE_RESERVE_ID_WBTC,
            debtReserveId: CORE_RESERVE_ID_USDC
        });
    }

    function _executeAaveV4Open(
        AaveV4TestPair memory _testPair,
        uint256 _supplyAmountInUSD,
        uint256 _borrowAmountInUSD,
        SmartWallet _wallet,
        bool _isEoaPosition
    ) internal returns (bool success) {
        if (!_executeAaveV4Supply(_testPair, _supplyAmountInUSD, _wallet, _isEoaPosition)) {
            console2.log("Failed to supply assets. Check caps and reserve/spoke status.");
            return false;
        }

        if (!_executeAaveV4Borrow(
                _testPair.spoke,
                _testPair.debtReserveId,
                _borrowAmountInUSD,
                _wallet.owner(), // to -> where to send the borrowed assets
                _wallet,
                _isEoaPosition
            )) {
            console2.log("Failed to borrow assets. Check caps and reserve/spoke status.");
            return false;
        }

        success = true;
    }

    function _executeAaveV4Supply(
        AaveV4TestPair memory _testPair,
        uint256 _supplyAmountInUSD,
        SmartWallet _wallet,
        bool _isEoaPosition
    ) internal returns (bool success) {
        address walletAddr = _wallet.walletAddr();
        address sender = _wallet.owner();
        ISpoke.Reserve memory reserve = ISpoke(_testPair.spoke).getReserve(_testPair.collReserveId);
        address underlying = reserve.underlying;
        uint256 supplyAmount =
            _amountInUSDPrice(_testPair.spoke, _testPair.collReserveId, _supplyAmountInUSD);

        if (!_isValidSupply(_testPair.spoke, supplyAmount, reserve)) return false;

        if (_isEoaPosition) {
            _enableEoaSupplyPositionManagers(ISpoke(_testPair.spoke), sender, walletAddr);
        }

        give(underlying, sender, supplyAmount);
        approveAsSender(sender, underlying, walletAddr, supplyAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4SupplyEncode(
                _testPair.spoke,
                _isEoaPosition ? sender : walletAddr, // onBehalf
                sender,
                _testPair.collReserveId,
                supplyAmount,
                true // useAsCollateral
            ),
            true // isDirect
        );

        _wallet.execute(address(new AaveV4Supply()), executeActionCallData, 0);

        success = true;
    }

    function _executeAaveV4Borrow(
        address _spoke,
        uint256 _reserveId,
        uint256 _borrowAmountInUSD,
        address _to,
        SmartWallet _wallet,
        bool _isEoaPosition
    ) internal returns (bool success) {
        ISpoke.Reserve memory reserve = ISpoke(_spoke).getReserve(_reserveId);
        address walletAddr = _wallet.walletAddr();
        address sender = _wallet.owner();

        uint256 borrowAmount = _amountInUSDPrice(_spoke, _reserveId, _borrowAmountInUSD);

        if (!_isValidBorrow(_spoke, borrowAmount, reserve)) {
            console2.log("Invalid borrow. Check caps and reserve/spoke status.");
            return false;
        }

        if (_isEoaPosition) {
            _enableEoaTakerPositionManager(ISpoke(_spoke), sender, walletAddr, _reserveId);
        }

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4BorrowEncode(
                _spoke,
                _isEoaPosition ? sender : walletAddr, // onBehalf
                _to,
                _reserveId,
                borrowAmount
            ),
            true // isDirect
        );

        _wallet.execute(address(new AaveV4Borrow()), executeActionCallData, 0);

        success = true;
    }

    function _enableEoaSupplyPositionManagers(ISpoke _spoke, address _eoa, address _walletAddr)
        internal
    {
        vm.startPrank(_eoa);
        _spoke.setUserPositionManager(GIVER_POSITION_MANAGER, true);
        _spoke.setUserPositionManager(CONFIG_POSITION_MANAGER, true);
        IConfigPositionManager(CONFIG_POSITION_MANAGER)
            .setCanSetUsingAsCollateralPermission(address(_spoke), _walletAddr, true);
        vm.stopPrank();
    }

    function _enableEoaRefreshPremiumPositionManager(
        ISpoke _spoke,
        address _eoa,
        address _walletAddr
    ) internal {
        vm.startPrank(_eoa);
        _spoke.setUserPositionManager(CONFIG_POSITION_MANAGER, true);
        IConfigPositionManager(CONFIG_POSITION_MANAGER)
            .setCanUpdateUserRiskPremiumPermission(address(_spoke), _walletAddr, true);
        IConfigPositionManager(CONFIG_POSITION_MANAGER)
            .setCanUpdateUserDynamicConfigPermission(address(_spoke), _walletAddr, true);
        vm.stopPrank();
    }

    function _enableEoaTakerPositionManager(
        ISpoke _spoke,
        address _eoa,
        address _walletAddr,
        uint256 _reserveId
    ) internal {
        vm.startPrank(_eoa);
        _spoke.setUserPositionManager(TAKER_POSITION_MANAGER, true);
        // Use type(uint256).max for test purposes.
        ITakerPositionManager(TAKER_POSITION_MANAGER)
            .approveBorrow(address(_spoke), _reserveId, _walletAddr, type(uint256).max);
        ITakerPositionManager(TAKER_POSITION_MANAGER)
            .approveWithdraw(address(_spoke), _reserveId, _walletAddr, type(uint256).max);
        vm.stopPrank();
    }

    function _amountInUSDPrice(address _spoke, uint256 _reserveId, uint256 _amountUSD)
        internal
        view
        returns (uint256)
    {
        IAaveV4Oracle oracle = IAaveV4Oracle(ISpoke(_spoke).ORACLE());
        uint256 price = oracle.getReservePrice(_reserveId);
        uint256 oracleDecimals = oracle.decimals();
        uint256 tokenDecimals = IERC20(ISpoke(_spoke).getReserve(_reserveId).underlying).decimals();
        return (_amountUSD * 10 ** (tokenDecimals + oracleDecimals)) / price;
    }

    function _isValidSupply(address _spoke, uint256 _amount, ISpoke.Reserve memory _reserve)
        internal
        view
        returns (bool)
    {
        ISpoke.ReserveConfig memory reserveConfig =
            ISpoke(_spoke).getReserveConfig(_reserve.assetId);
        if (reserveConfig.paused || reserveConfig.frozen) {
            console2.log("Reserve is halted or frozen, skipping test");
            return false;
        }

        IHub.SpokeData memory spokeData = IHub(_reserve.hub).getSpoke(_reserve.assetId, _spoke);
        if (!spokeData.active || spokeData.halted) {
            console2.log("Spoke is halted or inactive, skipping test");
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
        ISpoke.ReserveConfig memory reserveConfig =
            ISpoke(_spoke).getReserveConfig(_reserve.assetId);
        if (reserveConfig.paused || reserveConfig.frozen || !reserveConfig.borrowable) {
            console2.log("Reserve is paused or frozen or not borrowable, skipping test");
            return false;
        }

        IHub.SpokeData memory spokeData = IHub(_reserve.hub).getSpoke(_reserve.assetId, _spoke);
        if (!spokeData.active || spokeData.halted) {
            console2.log("Spoke is halted or inactive, skipping test");
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
