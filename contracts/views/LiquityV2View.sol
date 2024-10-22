// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../interfaces/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../interfaces/liquityV2/IBorrowerOperations.sol";
import { ITroveManager } from "../interfaces/liquityV2/ITroveManager.sol";
import { IStabilityPool } from "../interfaces/liquityV2/IStabilityPool.sol";
import { ISortedTroves } from "../interfaces/liquityV2/ISortedTroves.sol";
import { IHintHelpers } from "../interfaces/liquityV2/IHintHelpers.sol";
import { IPriceFeed } from "../interfaces/liquityV2/IPriceFeed.sol";

import { LiquityV2Helper } from "../actions/liquityV2/helpers/LiquityV2Helper.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";

contract LiquityV2View is LiquityV2Helper {
    using TokenUtils for address;

    struct TroveData {
        uint256 troveId;
        address collToken;
        ITroveManager.Status status;
        uint256 collAmount;
        uint256 debtAmount;
        uint256 collPrice;
        uint256 TCRatio;
        uint256 annualInterestRate;
        address interestBatchManager;
        uint256 batchDebtShares;
    }

    struct MarketData {
        address market;
        uint256 CCR;
        uint256 MCR;
        uint256 SCR;
        uint256 LIQUIDATION_PENALTY_SP;
        uint256 LIQUIDATION_PENALTY_REDISTRIBUTION;
        uint256 entireSystemColl;
        uint256 entireSystemDebt;
        address collToken;
        address troveNFT;
        address borrowerOperations;
        address troveManager;
        address stabilityPool;
        address sortedTroves;
        address collSurplusPool;
        address hintHelpers;
        address priceFeed;
        uint256 collPrice;
        bool isShutDown;
    }

    function isShutDown(address _market) public view returns (bool) {
        ITroveManager troveManager = ITroveManager(IAddressesRegistry(_market).troveManager());
        return troveManager.shutdownTime() != 0;      
    }

    function getApproxHint(
        address _market,
        uint256 _collIndex,
        uint256 _interestRate,
        uint256 _numTrials,
        uint256 _inputRandomSeed
    )
        public
        view
        returns (
            uint256 hintId,
            uint256 diff,
            uint256 latestRandomSeed
        )
    {   
        IHintHelpers hintHelpers = IHintHelpers(IAddressesRegistry(_market).hintHelpers());

        return hintHelpers.getApproxHint(
            _collIndex,
            _interestRate,
            _numTrials,
            _inputRandomSeed
        );
    }

    function findInsertPosition(
        address _market,
        uint256 _interestRate,
        uint256 _prevId,
        uint256 _nextId
    ) public view returns (uint256 prevId, uint256 nextId) {
        ISortedTroves sortedTroves = ISortedTroves(IAddressesRegistry(_market).sortedTroves());

        return sortedTroves.findInsertPosition(
            _interestRate,
            _prevId,
            _nextId
        );
    }

    function getInsertPosition(
        address _market,
        uint256 _collIndex,
        uint256 _interestRate,
        uint256 _numTrials,
        uint256 _inputRandomSeed
    ) external view returns (uint256 prevId, uint256 nextId) {
        (uint256 hintId, , ) = getApproxHint(
            _market,
            _collIndex,
            _interestRate,
            _numTrials,
            _inputRandomSeed
        );
        return findInsertPosition(_market, _interestRate, hintId, hintId);
    }

    function getTrovePosition(
        address _market,
        uint256 _collIndex,
        uint256 _troveId,
        uint256 _numTrials,
        uint256 _inputRandomSeed
    ) external view returns (uint256 prevId, uint256 nextId) {
        ITroveManager troveManager = ITroveManager(IAddressesRegistry(_market).troveManager());
        ISortedTroves sortedTroves = ISortedTroves(IAddressesRegistry(_market).sortedTroves());
        uint256 troveInterestRate = troveManager.getTroveAnnualInterestRate(_troveId);
       
        (uint256 hintId, , ) = getApproxHint(
            _market,
            _collIndex,
            troveInterestRate,
            _numTrials,
            _inputRandomSeed
        );

        (prevId, nextId) = sortedTroves.findInsertPosition(
            troveInterestRate,
            hintId,
            hintId
        );

        if (prevId == _troveId) prevId = sortedTroves.getPrev(_troveId);
        if (nextId == _troveId) nextId = sortedTroves.getNext(_troveId);
    }

    function getTroveInfo(address _market, uint256 _troveId) external view returns (TroveData memory trove) {
        ITroveManager troveManager = ITroveManager(IAddressesRegistry(_market).troveManager());
        IPriceFeed priceFeed = IPriceFeed(IAddressesRegistry(_market).priceFeed());
        ITroveManager.LatestTroveData memory latestTroveData = troveManager.getLatestTroveData(_troveId);

        (
            , , ,
            trove.status,
            , , , ,
            trove.interestBatchManager,
            trove.batchDebtShares
        ) = troveManager.Troves(_troveId);

        trove.troveId = _troveId;
        trove.annualInterestRate = latestTroveData.annualInterestRate;
        trove.collAmount = latestTroveData.entireColl;
        trove.debtAmount = latestTroveData.entireDebt;
        trove.collPrice = priceFeed.lastGoodPrice();
        trove.TCRatio = troveManager.getCurrentICR(_troveId, trove.collPrice);
        trove.collToken = IAddressesRegistry(_market).collToken();
    }

    function getMarketData(address _market) external view returns (MarketData memory data) {
        IAddressesRegistry registry = IAddressesRegistry(_market);
        address borrowerOperations = registry.borrowerOperations();
        data = MarketData({
            market: _market,
            CCR: registry.CCR(),
            MCR: registry.MCR(),
            SCR: registry.SCR(),
            LIQUIDATION_PENALTY_SP: registry.LIQUIDATION_PENALTY_SP(),
            LIQUIDATION_PENALTY_REDISTRIBUTION: registry.LIQUIDATION_PENALTY_REDISTRIBUTION(),
            entireSystemColl: IBorrowerOperations(borrowerOperations).getEntireSystemColl(),
            entireSystemDebt: IBorrowerOperations(borrowerOperations).getEntireSystemDebt(),
            collToken: registry.collToken(),
            troveNFT: registry.troveNFT(),
            borrowerOperations: borrowerOperations,
            troveManager: registry.troveManager(),
            stabilityPool: registry.stabilityPool(),
            sortedTroves: registry.sortedTroves(),
            collSurplusPool: registry.collSurplusPool(),
            hintHelpers: registry.hintHelpers(),
            priceFeed: registry.priceFeed(),
            collPrice: IPriceFeed(registry.priceFeed()).lastGoodPrice(),
            isShutDown: isShutDown(_market)
        });
    }

    function getDepositorInfo(address _market, address _depositor) 
        external
        view
        returns (
            uint256 compoundedBOLD,
            uint256 collGain,
            uint256 boldGain
        )
    {
        IStabilityPool stabilityPool = IStabilityPool(IAddressesRegistry(_market).stabilityPool());
        compoundedBOLD = stabilityPool.getCompoundedBoldDeposit(_depositor);
        collGain = stabilityPool.getDepositorCollGain(_depositor) + stabilityPool.stashedColl(_depositor);
        boldGain = stabilityPool.getDepositorYieldGain(_depositor);
    }

    function getDebtInFront(
        address _market,
        uint256 _troveId,
        uint256 _acc,
        uint256 _iterations
    ) external view returns (uint256 next, uint256 debt) {
        ITroveManager troveManager = ITroveManager(IAddressesRegistry(_market).troveManager());
        ISortedTroves sortedTroves = ISortedTroves(IAddressesRegistry(_market).sortedTroves());

        next = _troveId;
        debt = _acc;
        for (uint256 i = 0; i < _iterations; ++i) {
            next = sortedTroves.getNext(next);
            debt += _getTroveDebt(troveManager, next);
        }
    }

    function getDebtInFrontByInterestRate(
        address _market,
        uint256 _troveId,
        uint256 _acc,
        uint256 _iterations,
        uint256 _targetIR
    ) external view returns (uint256 next, uint256 debt) {
        ITroveManager troveManager = ITroveManager(IAddressesRegistry(_market).troveManager());
        ISortedTroves sortedTroves = ISortedTroves(IAddressesRegistry(_market).sortedTroves());

        next = _troveId == 0 ? sortedTroves.getLast() : _troveId;
        debt = _acc;

        for (uint256 i = 0; i < _iterations && next != 0; ++i) {
            if (troveManager.getTroveAnnualInterestRate(next) >= _targetIR) return (0, debt);

            debt += _getTroveDebt(troveManager, next);
            next = ISortedTroves(sortedTroves).getPrev(next);
        }
    }

    function getDebtInFrontByTroveNum(address _market, uint256 _numTroves) external view returns (uint256 debt) {
        ITroveManager troveManager = ITroveManager(IAddressesRegistry(_market).troveManager());
        ISortedTroves sortedTroves = ISortedTroves(IAddressesRegistry(_market).sortedTroves());

        uint256 next = sortedTroves.getLast();

        for (uint256 i = 0; i < _numTroves; i++) {
            debt += _getTroveDebt(troveManager, next);
            next = sortedTroves.getPrev(next);
        }
    }

    function getNumOfTrovesInFrontOfTrove(address _market, uint256 _troveId, uint256 _iterations) 
        external view returns (uint256 next, uint256 numTroves) 
    {        
        ISortedTroves sortedTroves = ISortedTroves(IAddressesRegistry(_market).sortedTroves());
        next = _troveId;
        for (uint256 i = 0; i < _iterations; i++) {
            next = sortedTroves.getNext(next);
            if (next == 0) return (next, numTroves);
            numTroves++;
        }
    }

    function _getTroveDebt(ITroveManager _troveManager, uint256 _troveId) internal view returns (uint256 debt) {
        (debt, , , , , , , , , ) = _troveManager.Troves(_troveId);
    }
}
