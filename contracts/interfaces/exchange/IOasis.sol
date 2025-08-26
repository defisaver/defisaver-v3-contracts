// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IOasis {
    function getBuyAmount(address tokenToBuy, address tokenToPay, uint256 amountToPay)
        external
        view
        virtual
        returns (uint256 amountBought);

    function getPayAmount(address tokenToPay, address tokenToBuy, uint256 amountToBuy)
        public
        view
        virtual
        returns (uint256 amountPaid);

    function sellAllAmount(address pay_gem, uint256 pay_amt, address buy_gem, uint256 min_fill_amount)
        public
        virtual
        returns (uint256 fill_amt);

    function buyAllAmount(address buy_gem, uint256 buy_amt, address pay_gem, uint256 max_fill_amount)
        public
        virtual
        returns (uint256 fill_amt);
}
