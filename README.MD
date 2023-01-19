Mapcovery
=================

![MapcoveryLogo](https://i.imgur.com/WPzHr1O.png)

- This was a hack for [ETHBerlinZwei](https://ethberlinzwei.com).
- Details can be found in [this overview presentation.](https://docs.google.com/presentation/d/17jVwLdRKOjDNAMzXtJShzpFil7H79M_7-JSFg7DZxJE/)
- Details on [devpost](https://devpost.com/software/mapcovery)
- Screencast on [YouTube](https://youtu.be/WSnmM0HCFg0)

## Problem: Key Management

- Private keys are too cryptic too remember
- Mnemonics are too hard to remember
- Social recovery is not really a solution
  - Either you are not sure about who to trust
  - Do you really want to put the burden on friends/family?
- Time lock is cool but not a recovery solution by itself
- If just a single character is wrong, the private key is wrong and recovery is not possible.
- Current key recovery solutions are either way less secure or less convenient

## Inspiration

- [FOAM](https://www.foam.space)
- [“Memory Palace”](https://artofmemory.com/wiki/How_to_Build_a_Memory_Palace)
  - https://www.studygs.net/memory/memloci.htm 
  - https://en.wikipedia.org/wiki/Method_of_loci 
  - Take a mental walk to memorize up to 20 objects
- Locations are easy to remember

## What it does & how does it work?

_Prerequisite: You need a smart contract wallet ([Gnosis Safe](https://safe.gnosis.io))_
- Select 5 locations of your choice.
- Geo-data is hashed to derive the private key to recovery account
  - [FOAM](https://www.foam.space) is used as decentralized geo-data provider
- Smart contract module is attached to your Gnosis Safe
- You can recover by entering the 5 Locations to get the private key for recovery account
- Sign recovery and new Safe owners using recovery account

## How we built it

- We wrote a module for the Gnosis Safe smart contract in Solidity.
- There are 2 use cases: (1) Set up mapcovery and (2) perform mapcovery to recover your wallet.
- We wrote a webapp and an Android app to allow users to set up mapcovery and also to perform the actual recovery.

## Challenges we ran into

- Where would we get reliable geo-location data from?
- What is a good number of locations to reach sufficient security?
- How can we prevent front running?
- How can we make sure to not leak the 5 locations when performing recovery?

## Accomplishments that we're proud of

- Finding another possible recovery method for smart contract wallets.
- Finding a method that is relatively easy to remember but still provides enough security.
- Solving for front-running through elegant smart-contract design.

## What we learned

- How FOAM really works incl. their APIs and why it is needed.
- What ways of storing location data exist out there incl. their advantages and disadvantages.
- How modules work with the Gnosis Safe
- How to design and build prototypes with Adobe XD.
- How hacking is enhanced when techno music is blasting through Factory the entire day.

## What's next for Mapcovery
- Allow users to configure more parameters:
  - Number of locations
  - Time-lock period
- Add bonds required to trigger mapcovery
- Allow recovery cancellations.
- Allow Gnosis Safe users on iOS and Android to set up mapcovery, if they would like to do so.
- Security audit of the contract code.
- Add more locations to FOAM in order to increase security and make brute-force attacks harder.
- Wait for FOAM's "Presence Claims" and integrate them. They are a ways to check that someone is actually present at a location. If enabled for Mapcovery, this would increase security even more by requiring physical presence at the recovery locations. This would decrease convenience but attacks get harder by multiple orders of magnitude.
- Broaden use cases for Mapcovery (Other smart contract wallets, potentially even traditional EOA wallets, etc.)

Contributors
------------
- Lukas Schor ([lukasschor](https://github.com/lukasschor))
- German Martinez ([germartinez](https://github.com/germartinez))
- Richard Meissner ([rmeissner](https://github.com/rmeissner))
- Tobias Schubotz ([tschubotz](https://github.com/tschubotz))
