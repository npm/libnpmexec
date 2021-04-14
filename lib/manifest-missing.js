const manifestMissing = (tree, mani) => {
  // if the tree doesn't have a child by that name/version, return true
  // true means we need to install it
  const child = tree.children.get(mani.name)
  // if no child, we have to load it
  if (!child)
    return true

  // if no version/tag specified, allow whatever's there
  if (mani._from === `${mani.name}@`)
    return false

  // otherwise the version has to match what we WOULD get
  return child.version !== mani.version
}

module.exports = manifestMissing
