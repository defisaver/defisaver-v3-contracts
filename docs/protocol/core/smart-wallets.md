---
icon: code-branch
---

# Smart wallets

Every operation inside the DeFi Saver system is executed from the user’s smart wallet. DeFi Saver originally started with the `DSProxy` smart wallet, originating from `MakerDAO`, and later added support for `Safe Wallets`, as well as `Instadapp DSA` smart wallets and `Summer.Fi` smart wallets.

Currently, the Safe smart wallet is the default wallet created by the DeFi Saver UI for new users, with an option to load existing `DSProxy`, `DSAProxy`, or `Summer.Fi` smart wallets.

The table below lists the supported feature sets for each smart wallet type:

| Smart wallet         | Manual recipe execution | Strategy execution   | TxSaver execution    |
| -------------------- | ----------------------- | -------------------- | -------------------- |
| Safe                 | :white\_check\_mark:    | :white\_check\_mark: | :white\_check\_mark: |
| DSProxy              | :white\_check\_mark:    | :white\_check\_mark: | :x:                  |
| DSAProxy (Instadapp) | :white\_check\_mark:    | :x:                  | :x:                  |
| Summer.Fi proxy      | :white\_check\_mark:    | :x:                  | :x:                  |

