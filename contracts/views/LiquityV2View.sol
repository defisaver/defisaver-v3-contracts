// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../interfaces/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../interfaces/liquityV2/IBorrowerOperations.sol";
import { ITroveManager } from "../interfaces/liquityV2/ITroveManager.sol";
import { IStabilityPool } from "../interfaces/liquityV2/IStabilityPool.sol";
import { ISortedTroves } from "../interfaces/liquityV2/ISortedTroves.sol";
import { IHintHelpers } from "../interfaces/liquityV2/IHintHelpers.sol";
import { IPriceFeed } from "../interfaces/liquityV2/IPriceFeed.sol";
import { ITroveNFT } from "../interfaces/liquityV2/ITroveNFT.sol";
import { LiquityV2Helper } from "../actions/liquityV2/helpers/LiquityV2Helper.sol";

contract LiquityV2View is LiquityV2Helper {
    struct TroveData {
        uint256 troveId;
        address owner;
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
        address activePool;
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
        ITroveNFT troveNFT = ITroveNFT(IAddressesRegistry(_market).troveNFT());

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

        try troveNFT.ownerOf(_troveId) returns (address owner) {
            trove.owner = owner;
        } catch {
            trove.owner = address(0);
        }
    }

    /// @notice Helper struct to store troves when fetching user troves
    /// @param troveId The trove ID
    /// @param ownedByUser Whether the trove is owned by the user or not
    struct ExistingTrove {
        uint256 troveId;
        bool ownedByUser;
    }

    /// @notice Get the trove IDs for a user in a give market
    /// @param _user The user address
    /// @param _market The market address
    /// @param _startIndex The start index to search for troves (inclusive)
    /// @param _endIndex The end index to search for troves (exclusive)
    /// @return troves The trove IDs for the given range
    /// @return nextFreeTroveIndex The next free trove index if exists, or -1 if no free index found in given range
    function getUserTroves(
        address _user,
        address _market,
        uint256 _startIndex,
        uint256 _endIndex
    )   external view returns (ExistingTrove[] memory troves, int256 nextFreeTroveIndex) 
    {   
        nextFreeTroveIndex = -1; 
        IAddressesRegistry market = IAddressesRegistry(_market);
        ITroveManager troveManager = ITroveManager(market.troveManager());
        ITroveNFT troveNFT = ITroveNFT(market.troveNFT());
        
        uint256 numTroves = _endIndex - _startIndex;
        troves = new ExistingTrove[](numTroves);

        for (uint256 i = _startIndex; i < _endIndex; ++i) {
            uint256 troveId = uint256(keccak256(abi.encode(_user, i)));
            ITroveManager.Status status = troveManager.getTroveStatus(troveId);
            if (status == ITroveManager.Status.active || status == ITroveManager.Status.zombie) {
                troves[i - _startIndex] = ExistingTrove({ 
                    troveId: troveId,
                    ownedByUser: troveNFT.ownerOf(troveId) == _user 
                });
            } else if (nextFreeTroveIndex == -1) {
                nextFreeTroveIndex = int256(i);
            }
        }
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
            activePool: registry.activePool(),
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
            if (next == 0) return (next, debt);
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
            if (next == 0) return debt;
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

    function predictAdjustTroveUpfrontFee(address _market, uint256 _collIndex, uint256 _troveId, uint256 _debtIncrease) 
        external view returns (uint256)
    {
        IAddressesRegistry market = IAddressesRegistry(_market);
        IHintHelpers hintHelpers = IHintHelpers(market.hintHelpers());

        return hintHelpers.predictAdjustTroveUpfrontFee(_collIndex, _troveId, _debtIncrease);
    }

    function _getTroveDebt(ITroveManager _troveManager, uint256 _troveId) internal view returns (uint256 debt) {
        (debt, , , , , , , , , ) = _troveManager.Troves(_troveId);
    }
}
