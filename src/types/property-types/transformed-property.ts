import { observable } from "mobx"
import { Property } from "./property"
import { getNode, valueToSnapshot } from "../../core/node"
import { escapeJsonPath } from "../../core/json-patch"
import { addHiddenWritableProp } from "../../utils"

export class TransformedProperty extends Property {
    constructor(propertyName: string, public setter: Function, public getter: Function) {
        super(propertyName)
    }

    initialize(targetInstance: any) {
        const box = observable.shallowBox(null, targetInstance.constructor.name + "." + this.name)
        addHiddenWritableProp(targetInstance, this.name + "$value", box)
        const self = this
        Object.defineProperty(targetInstance, this.name, {
            get: function() {
                return self.getter.call(this, box.get())
            },
            set: function(v) {
                const node = getNode(this)
                const newValue = self.setter.call(this, v)
                box.set(newValue)
                node.emitPatch({
                    op: "replace",
                    path: "/" + escapeJsonPath(self.name),
                    value: valueToSnapshot(newValue)
                }, node)
            }
        })
    }

    serialize(instance: any, snapshot: any) {
        snapshot[this.name] = valueToSnapshot(instance[this.name + "$value"].get())
    }

    deserialize(instance: any, snapshot: any) {
        instance[this.name + "$value"].set(snapshot[this.name])
    }

    isValidSnapshot(snapshot: any) {
        // TODO: is a better check possible?
        return this.name in snapshot
    }
}
