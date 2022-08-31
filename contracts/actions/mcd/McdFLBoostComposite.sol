// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../ActionBase.sol";
import "../exchange/DFSSell.sol";
import "../fee/GasFeeTaker.sol";

import "../../interfaces/balancer/IFlashLoanRecipient.sol";
import "../../interfaces/balancer/IFlashLoans.sol";
import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IDaiJoin.sol";
import "../../interfaces/mcd/IJug.sol";

import "../../utils/ReentrancyGuard.sol";
import "../../utils/TokenUtils.sol";
import "../../core/strategy/StrategyModel.sol";

import "./helpers/McdHelper.sol";
import "../balancer/helpers/MainnetBalancerV2Addresses.sol";

contract McdFLBoostComposite is
ActionBase, DFSSell, GasFeeTaker, McdHelper, IFlashLoanRecipient,
ReentrancyGuard, MainnetBalancerV2Addresses {
    using TokenUtils for address;

    error RatioNotHigherThanBefore(uint256, uint256);
    address internal immutable ACTION_ADDR = address(this);

    /// @param vaultId Id of the vault
    /// @param joinAddr Collateral join address
    /// @param gasUsed Gas amount to charge in strategies
    /// @param exchangeData Data needed for swap
    struct BoostParams {
        uint256 vaultId;
        address joinAddr;
        uint256 gasUsed;
        ExchangeData exchangeData;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override (ActionBase, DFSSell, GasFeeTaker) returns (bytes32) {
        BoostParams memory boostParams = _parseCompositeParams(_callData);

        boostParams.vaultId = _parseParamUint(
            boostParams.vaultId,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        boostParams.joinAddr = _parseParamAddr(
            boostParams.joinAddr,
            _paramMapping[1],
            _subData,
            _returnValues
        );

        boostParams.exchangeData.srcAddr = _parseParamAddr(
            boostParams.exchangeData.srcAddr,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        boostParams.exchangeData.destAddr = _parseParamAddr(
            boostParams.exchangeData.destAddr,
            _paramMapping[3],
            _subData,
            _returnValues
        );

        boostParams.exchangeData.srcAmount = _parseParamUint(
            boostParams.exchangeData.srcAmount,
            _paramMapping[4],
            _subData,
            _returnValues
        );

        _flBalancer(boostParams);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override (ActionBase, DFSSell, GasFeeTaker) {
        BoostParams memory boostParams = _parseCompositeParams(_callData);
        _flBalancer(boostParams);
    }

    /// @notice Gets a FL from Balancer
    function _flBalancer(BoostParams memory _boostParams) internal {
        assert(_boostParams.exchangeData.srcAddr == DAI_ADDR);

        address[] memory tokens = new address[](1);
        uint256[] memory amounts = new uint256[](1);

        tokens[0] = _boostParams.exchangeData.srcAddr;
        amounts[0] = _boostParams.exchangeData.srcAmount;

        IManager(MCD_MANAGER_ADDR).cdpAllow(_boostParams.vaultId, ACTION_ADDR, 1);
        IFlashLoans(VAULT_ADDR).flashLoan(
            ACTION_ADDR,
            tokens,
            amounts,
            abi.encode(_boostParams, address(this))
        );
        IManager(MCD_MANAGER_ADDR).cdpAllow(_boostParams.vaultId, ACTION_ADDR, 0);
    }

    /// @notice Balancer FL callback function that formats and calls back this action contract
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external override nonReentrant {
        require(msg.sender == VAULT_ADDR, "Untrusted lender");
        (BoostParams memory boostParams, address proxy) = abi.decode(_userData, (BoostParams, address));

        _boost(proxy, _feeAmounts[0], boostParams);

        uint256 flPaybackAmount = _amounts[0] + _feeAmounts[0];
        _tokens[0].withdrawTokens(address(VAULT_ADDR), flPaybackAmount);
    }

    /// @notice Executes boost logic
    function _boost(address _proxy, uint256 _flFeeAmount, BoostParams memory _boostParams) internal {
        (address urn, bytes32 ilk) = getUrnAndIlk(MCD_MANAGER_ADDR, _boostParams.vaultId);
        address collateralAsset = _boostParams.exchangeData.destAddr;
        uint256 boostAmount = _boostParams.exchangeData.srcAmount + _flFeeAmount;

        // Sell flashloaned debt asset for collateral asset
        (uint256 exchangedAmount, ) = _dfsSell(_boostParams.exchangeData, address(this), address(this), false);

        // Take gas fee
        uint256 supplyAmount = _takeFee(GasFeeTakerParams(
            _boostParams.gasUsed,
            collateralAsset,
            exchangedAmount,
            0
        ));

        // check if boost lowers CR
        {
            (uint256 collateral, uint256 debt) = getCdpInfo(
                IManager(MCD_MANAGER_ADDR),
                _boostParams.vaultId,
                ilk
            );

            uint256 rawRatioBefore = rdiv(collateral, debt);
            uint256 rawRatioAfter = rdiv(collateral + supplyAmount, debt + boostAmount);
            if (rawRatioAfter > rawRatioBefore) revert RatioNotHigherThanBefore(rawRatioBefore, rawRatioAfter);
        }

        // Draw debt and supply collateral
        {
            uint256 rate = IJug(JUG_ADDRESS).drip(ilk);
            uint256 daiVatBalance = vat.dai(urn);
            int256 vatSupplyAmount = toPositiveInt(convertTo18(_boostParams.joinAddr, supplyAmount));
            int256 drawAmountNormalized = normalizeDrawAmount(boostAmount, rate, daiVatBalance);

            collateralAsset.approveToken(_boostParams.joinAddr, supplyAmount);
            IJoin(_boostParams.joinAddr).join(urn, supplyAmount);
            IManager(MCD_MANAGER_ADDR).frob(
                _boostParams.vaultId,
                vatSupplyAmount,
                drawAmountNormalized
            );
            IManager(MCD_MANAGER_ADDR).move(_boostParams.vaultId, address(this), toRad(boostAmount));

            vat.hope(DAI_JOIN_ADDR);
            IDaiJoin(DAI_JOIN_ADDR).exit(address(this), boostAmount);
            vat.nope(DAI_JOIN_ADDR);
        }

        logger.logRecipeEvent("McdFLBoostComposite");
        emit ActionEvent("", abi.encode(
            _proxy,
            boostAmount,
            exchangedAmount,
            supplyAmount
        ));
    }

    /// @inheritdoc ActionBase
    function actionType()
    public
    pure
    virtual override (ActionBase, DFSSell, GasFeeTaker)
    returns (uint8) {
        return uint8(ActionType.CUSTOM_ACTION);
    }

    function _parseCompositeParams(bytes memory _calldata) internal pure returns (BoostParams memory params) {
        params = abi.decode(_calldata, (BoostParams));
    }

    /// @dev workaround for dfsSell expecting context to be proxy
    function owner() external view returns (address) {
        return ACTION_ADDR;
    }
}