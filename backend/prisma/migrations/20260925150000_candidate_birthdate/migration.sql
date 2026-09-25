-- Store an optional candidate date of birth for interview identification and derived age criteria.

ALTER TABLE `Candidate`
  ADD COLUMN `birthdate` DATETIME(3) NULL;
